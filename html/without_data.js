// structure of JSON
// { xLabel: string,
//   yLabel: string,
//   series: [ tests ] }
//
// tests := { name: string,
//            description: { start : int, sampling: float, stabilize: bool,
//                           quota: float, run: int, instances: [string],
//                           samples: int, time : float}
//            dataset: [ point ],
//            hist : [ v: float ] (optional)
//            result: { estimate: float, r_square: float (optional) } }
//
// point := { x : double,
//            y : double }
//
// xLabel and yLabel are the same for any tests
window.onload = function () {

const wsvg = 500;
const hsvg = 400;
const wslider = 200;
const hslider = 50;
const margin = {left:50,right:50,top:50,bottom:50};
const dotSize = 1.5;
const innerW = wsvg-(margin.left+margin.right);
const innerH = hsvg-(margin.top+margin.bottom);

const marginbar = {left:150,right:150,top:50,bottom:50};
const wbar = 2*wsvg-100;
const innerWbar = wbar-(marginbar.left+marginbar.right);

function plot_summarize_bar_graph(container, inputs) {

    const hbar = d3.min([60*inputs.series.length, hsvg]);
    const innerHbar = hbar - marginbar.top - marginbar.bottom;

    const xb = d3.scaleLinear()
	  .range([0, innerWbar])
	  .domain([0, d3.max(inputs.series, serie => serie.result.estimate)])
	  .nice();
    const yb = d3.scaleBand()
	  .range([0, innerHbar])
	  .padding(0.2)
	  .domain(inputs.series.map(serie => serie.name));
    const xbAxis = d3.axisBottom()
	  .scale(xb)
	  .ticks(8, "s");
    const ybAxis = d3.axisLeft()
	  .scale(yb);

    const bargraph =
	container.append("svg")
	.attr("width", wbar)
	.attr("height", hbar);

    // background
    bargraph.append("rect")
  	.attr("x", marginbar.left)
  	.attr("y", marginbar.top)
  	.attr("width", innerWbar)
  	.attr("height", innerHbar)
  	.attr("class", "background axis");
    // graph title
    bargraph.append("text")
  	.attr("class", "chartTitle")
  	.attr("x", wbar/2)
  	.attr("y", marginbar.top-10)
  	.text("Benchmarks summary");
    // x Axis
    bargraph.append("g")
	.attr("transform","translate("+marginbar.left+","+(hbar-marginbar.bottom)+")")
	.attr("class", "axis")
	.call(xbAxis);
    // x axis title
    bargraph.append("text")
	.attr("class", "axisTitle")
	.attr("x", wbar/2)
	.attr("y", hbar-10)
	.text("Estimated "+inputs.yLabel);
    // y Axis
    bargraph.append("g")
	.attr("transform","translate("+marginbar.left+","+marginbar.bottom+")")
	.attr("class", "axis")
	.call(ybAxis);
    // Bargraph
    bargraph.append("g")
	.attr("transform","translate("+marginbar.left+","+marginbar.top+")")
	.selectAll(".bar")
   	.data(inputs.series)
	.enter()
	.append("rect")
	.attr("class", "bar")
	.attr("y", serie => yb(serie.name))
	.attr("height", yb.bandwidth)
	.attr("x", serie => 0)
	.attr("width", serie => xb(serie.result.estimate));
};

// [histrogram (data, barwidth, min, max)] computes histogram
// values as follows:
// - a value [v] of [data] contributes to the bar between [u] and
// [u+barwidth] if u <= v < u+barwidth
// - the [i]th bar is between [min+i*barwidth] and [min+(i+1)*barwidth]
// - [max] is used only to determine the number of bars. It MUST be greater
// than [d3.max(data)]
function histogram(data, barwidth, min, max) {
    const nbar = Math.floor((max-min)/barwidth)+1;
    let hist = new Array(nbar);
    for (let i=0; i<nbar; i++) {
	hist[i]=0;
    }

    data.forEach(function(v) {
	const ind = Math.floor((v-min)/barwidth);
	hist[ind] ++;
    });

    let n = data.length;
    for (let i=0; i<nbar; i++) {
	hist[i] = hist[i];
    }

    return hist;
}

// [plot_histogram(container, data, bandwidth, xscale, yscale)]
// draws the histogram computes with
// [histogram(data, barwidth, d3.min(data), d3.max(data)]
// in the html element [container].
//
// Axis are already defined on [container], using [xscale] and [yscale].
//
// In addition, this function returns the update function
// that redraw the bar if called with a new barwidth.
function plot_histogram(container, data, barwidth, xscale, yscale) {
    const min = d3.min(data),
	  max = d3.max(data);
    const hist = histogram(data, barwidth, min, max);

    const rects =
	  container
	  .selectAll(".bar")
   	  .data(hist)
	  .enter();

    rects.append("rect")
	.attr("class", "bar")
	.attr("x", (v, i) => xscale(i*barwidth+min))
	.attr("width", (v, i) => xscale(barwidth)-xscale(0))
	.attr("y", (v, i) => yscale(v))
	.attr("height", (v, i) => innerH-yscale(v));

    function update_hist(nbarwidth) {
	//compute new histograph values
	const nhist = histogram(data, nbarwidth, min, max);

	const rects =
	      container
	      .selectAll(".bar")
   	      .data(nhist);

	rects.exit().remove();

	rects.enter().append("rect").attr("class", "bar")
	    .merge(rects)
	    .attr("x", (v, i) => xscale(i*nbarwidth+min))
	    .attr("width", (v, i) => xscale(nbarwidth)-xscale(0))
	    .attr("y", (v, i) => yscale(v))
	    .attr("height", (v, i) => innerH-yscale(v));
    }
    return update_hist;
};

// [kernelDensityEstimation(data, bandwith] returns the function x -> kde(x) for [data]
// The kernel function used is a gaussian.
const SQRT_2PI = Math.sqrt(2 * Math.PI);
function kernelDensityEstimation(X, bandwidth) {
    //gaussian constante
    const a = 1/(2*bandwidth*bandwidth);
    const b = bandwidth * SQRT_2PI;
    const gaussianKernel =
	  function (x) {
	      return Math.exp(-a * x * x) / b;
	  };

    return function (x) {
        let i = 0;
        let sum = 0;
        for (i = 0; i < X.length; i++) {
	    sum += gaussianKernel(x - X[i])/X.length;
        }
	return sum ;
    };
}

// [plot_kde(container, data, bandwidth, xscale, yscale, x)] draws
// the kde function computes with [kde(data, bandwidth)]
// for the abscisse values defined by [x], in the html element
// [container].
//
// Axis are already defined on [container], using [xscale] and
// [yscale].
//
// In addition, this function returns the update function that
// redraw the curve if called with a new bandwidth.

function plot_kde(container, data, bandwidth, xscale, yscale, x) {
    const n = x.length;
    const kde = kernelDensityEstimation(data, bandwidth);
    const density = new Array(n);

    for (let i=0; i<n;i++){
	let tmp = x[i] ;
	density[i] = [tmp, kde(tmp)];
    }

    const graph =
	  container
	  .append('g')
	  .append("path")
	  .attr("class", "mypath")
	  .datum(density)
	  .attr("fill", "#4ECDC4")
	  .attr("opacity", ".8")
	  .attr("stroke", "#292F36")
	  .attr("stroke-width", 1)
	  .attr("stroke-linejoin", "round")
	  .attr("d",
		d3.line()
		.curve(d3.curveBasis)
		.x(d => xscale(d[0]))
		.y(d => yscale(d[1])));

    function update_kde(nbandwidth) {
	let kde = kernelDensityEstimation(data, nbandwidth);

	for (let i=0; i<n;i++){
	    density[i][1] = kde(density[i][0]);
	}

	graph.datum(density)
	    .transition()
	    .duration(50)
	    .attr("d",
		  d3.line()
		  .curve(d3.curveBasis)
		  .x(d => xscale(d[0]))
		  .y(d => yscale(d[1])));
    };

    return update_kde;
};

// Main function : place containers and call plot functions.
function render(inputs) {
    inputs.series.forEach(
	function(serie) {
	    serie.dataset.forEach(
		function(d) {
		    d.x = +d.x;
		    d.y = +d.y;
		});}
    );

    // ************************************************ //
    //              Summarize bar graph                 //
    // ************************************************ //
    let bar_container = d3.select("body")
	.append("div")
	.attr("class", "center")
	.attr("id", "bar");
    plot_summarize_bar_graph(bar_container, inputs);

    // Two columns layouts :
    // - left for linear regressions
    // - right for hist/kde curves
    const main =
	  d3.select("body")
	  .append("div")
	    .attr("class", "center")
	    .attr("id", "main");

    const rows = d3.select("#main")
	  .selectAll("div")
	  .data(inputs.series)
	  .enter()
	  .append("div")
	    .attr("id", (data, i) => "main-bechamel-"+i)
   	    .attr("class", "row");

    rows.append("div")
	.attr("class", "c1");

    rows.append("div")
	.attr("class", "c2");

    const left = rows.selectAll("div.c1");
    const right = rows.selectAll("div.c2");

    // ************************************************ //
    //                  Left Column                     //
    // ************************************************ //
    left.each( function(serie) {
	//Curves for each input
	const xMin = 0;
	const xMax = d3.max(serie.dataset, d => d.x);
	const yMin = 0;
	const yMax = d3.max(serie.dataset, d => d.y);
	const xScale = d3.scaleLinear()
  	      .domain([xMin,xMax])
  	      .range([0,innerW])
  	      .nice();
	const yScale = d3.scaleLinear()
  	      .domain([yMin,yMax])
  	      .range([innerH,0])
  	      .nice();
	const xAxis = d3.axisBottom()
  	      .scale(xScale)
  	      .ticks(8, "s");
	const yAxis = d3.axisLeft()
  	      .scale(yScale)
  	      .ticks(8, "s");
	const center = d3.select(this)
	      .append("div")
	      .attr("class", "center")
	      .attr("id", "bechamel");
	let plotdiv = center
  	    .append("div")
	    .attr("id", "bechamel-"+serie.name);
  	let plot =
	    plotdiv
	    .append("svg")
  	      .attr("width",wsvg)
  	      .attr("height",hsvg);
	//background
	plot.append("rect")
  	    .attr("x",margin.left)
  	    .attr("y",margin.top)
  	    .attr("width",innerW)
  	    .attr("height",innerH)
  	    .attr("class","background axis");
	//graph title
	plot.append("text")
  	    .attr("class","chartTitle")
  	    .attr("x",wsvg/2)
  	    .attr("y",margin.top-10)
  	    .text("# " + serie.name);
	//x axis
	plot.append("g")
  	    .attr("transform","translate("+margin.left+","+(hsvg-margin.bottom)+")")
	    .attr("class", "axis")
  	    .call(xAxis);
	//x axis title
	plot.append("text")
	    .attr("class", "axisTitle")
	    .attr("x", wsvg/2)
	    .attr("y", hsvg-10)
	    .text(inputs.xLabel);
	//y axis
	plot.append("g")
  	    .attr("transform","translate("+margin.left+","+margin.bottom+")")
	    .attr("class", "axis")
  	    .call(yAxis);
	//y axis title
	plot.append("text")
	    .attr("class", "axisTitle ytitle")
	    .attr("transform-origin", 0, hsvg/2)
	    .attr("x", 0)
	    .attr("y", hsvg/2)
	    .text(inputs.yLabel);
	//data
	plot.append("g")
	    .attr("transform","translate("+margin.left+","+margin.top+")")
  	    .selectAll("circle")
  	    .data(serie.dataset)
  	    .enter()
  	    .append("circle")
	    .attr("class", "circle")
  	    .attr("r", dotSize)
  	    .attr("cx", d => xScale(d.x))
  	    .attr("cy", d => yScale(d.y));

	//Text boxes
	const xVals = serie.dataset.map((e,j) => e.x);
	const yVals = serie.dataset.map((e,j) => e.y);
	const meanX = ss.mean(xVals).toFixed(0);
	const meanY = ss.mean(yVals).toFixed(2);
	const varX = ss.sampleVariance(xVals).toFixed(0);
	const varY = ss.sampleVariance(yVals).toFixed(1);
	const corCoeff = ss.sampleCorrelation(xVals,yVals).toFixed(3);
	const pairs = [];
	xVals.forEach((d,i) => pairs.push([xVals[i],yVals[i]]));
	const linReg = ss.linearRegression(pairs);
	const linRegLine = ss.linearRegressionLine(linReg);
	let summary=[
	    ["Mean of x", meanX],
	    ["Mean of y", meanY],
	    ["Sample variance of x", varX],
	    ["Sample variance of y", varY],
	    ["Correlation between x and y", corCoeff],
	    ["Linear regression line", "y = "+linReg.b.toFixed(2)+" + "+linReg.m.toFixed(3)+"x"],
	    ["Coefficient", serie.result.estimate],
	    ["R²", serie.result.r_square]
	];

	plotdiv
	    .append("table")
	    .append("tbody")
    	    .selectAll("tr")
    	    .data(summary)
    	    .enter()
    	    .append("tr")
	    .selectAll("td")
	    .data(d => d)
	    .enter()
	    .append("td")
	    .text(d => d);

	let line = d3.select(this)
	    .append("line")
    	      .attr("transform","translate("+margin.left+","+margin.top+")")
    	      .attr("class","regLine")
    	      .attr("x1",xScale(xMin))
    	      .attr("x2",xScale(xMin))
    	      .attr("y1",yScale(linRegLine(xMin)))
    	      .attr("y2",yScale(linRegLine(xMin)));
	line.transition().duration(1000).delay(2000)
    	      .attr("x2",xScale(xMax))
    	      .attr("y2",yScale(linRegLine(xMax)));

    });

    // ************************************************ //
    //                  Right Column                    //
    // ************************************************ //
    right.each(function (serie, i) {

	const data = serie.kde;
	//Some default values
	const min_slider = (d3.max(data)-d3.min(data))/data.length*2;
	const max_slider = (d3.max(data)-d3.min(data))/20;
	let vslider = min_slider;
	console.log(min_slider + ' '+ max_slider);
	//Radio buttons
	const radio_container =
	    d3.select(this)
	    .append("div")
	    .attr("id","radio")
	    .attr("class", "radio");
	const form =
	    radio_container
	    .append("form");
	form.append("input")
	    .attr("type", "radio")
	    .attr("name", "graph")
	    .attr("value", "hist"+i)
	    .attr("name", "graph")
	    .attr("checked", "checked")
	    .on("change", f => {
		plot_chosen_graph(d3.select(this), "hist");
	    });
	form.append("label")
	    .attr("for", "hist"+i)
	    .text("Histogram");
	form.append("input")
	    .attr("type", "radio")
	    .attr("value", "kde"+i)
	    .attr("name", "graph")
	    .on("change", f => {
		plot_chosen_graph(d3.select(this), "kde");
	    });
	form.append("label")
	    .attr("for", "kde"+i)
	    .text("KDE");

	//svg for histogram and kde graphs
	let pdfgraph =
	    d3.select(this)
		.append("svg")
		  .attr("id", "pdfgraph")
		  .attr("width", wsvg)
		  .attr("height", hsvg)
		.append("g")
	    .attr("transform", "translate("+margin.left+","+(margin.top-25)+")");

	//axis
	const min = d3.min(data),
	      max = d3.max(data);
	const minX = d3.max([0, min-max_slider]),
	      maxX = max+max_slider;


	//X axis is the same for both graphs (histogram and kde)
	const xscale = d3.scaleLinear()
	      .range([0, innerW])
	      .domain([minX, maxX])
	      .nice();
	const xAxis = d3.axisBottom()
	      .scale(xscale)
	      .ticks(8, "s");

	//Y axis has a different domain value between both graphs.
	//So yscale.domain() is defined individually for each plot.
	const yscale = d3.scaleLinear()
	      .range([0, innerH])
	      .nice();
	const yAxis = d3.axisLeft()
	      .scale(yscale)
	      .ticks(8, "s");

	//x value for kde graph
	const n = 1000;
	const x = Array(n);
	const xmin = d3.min(xscale.domain()),
	      xmax = d3.max(xscale.domain());
	for (let i=0; i<n; i++) {
	    x[i] = xmin + i*(xmax-xmin)/n;
	}
	//Compute kde function for min bandwidth value to determine to determine
	//the max value of Y axis. Only happens one time when loading the webpage.
	const kde = kernelDensityEstimation(data, min_slider);
	const v = new Array(n);
	for (let i=0; i<n;i++){
	    v[i] = kde(x[i]);
	}
	const maxYkde = d3.max(v),
	      maxYhist = d3.max(histogram(data, max_slider, min, max));

	//background
	pdfgraph
	    .append("rect")
  	      .attr("x", 0)
  	      .attr("y", 0)
  	      .attr("width", innerW)
  	      .attr("height", innerH)
  	      .attr("class","background axis");

	// x Axis
	const gxAxis =
	      pdfgraph
	        .append("g")
	          .attr("transform","translate(0"+","+innerH+")")
	          .attr("class", "axis")
	          .call(xAxis);

	// y Axis
	const gyAxis =
	      pdfgraph
	        .append("g")
	          .attr("class", "axis")
	          .call(yAxis);

	plot_chosen_graph(d3.select(this), "hist");

	function plot_chosen_graph(container, choice) {

	    let rects =
		container.selectAll(".bar").remove();

	    let path =
		container.select(".mypath").remove();

	    // Erasing control and info panels if it exists and initialising it
	    let control = container.select("#control");
	    if (!control.empty())  {
		control.remove();
	    }
	    control =
		container
		.append("div")
		.attr("id", "control");

	    //Hist part
	    if (choice=="hist") {
		//Defined yAxis
		yscale.domain([maxYhist, 0]).nice();
		yAxis.scale(yscale);
		gyAxis.call(yAxis);

		const barwidth = vslider;
		// Redefine axis

		const update_hist = plot_histogram(pdfgraph, data, barwidth, xscale, yscale);

		//slider
		control.insert("p")
		    .attr("align", "center")
		    .text("Barwidth");

		control.insert("svg")
		    .attr("width", wsvg)
		    .attr("height", hslider)
		    .append("g")
		    .attr("transform", "translate("+(wsvg-wslider)/2+",10)")
		    .call(d3
			  .sliderBottom()
			  .min(min_slider)
			  .max(max_slider)
			  .width(wslider)
			  .ticks(5, "s")
			  .default(vslider)
			  .fill("red")
			  .on("onchange", value => {
			      if (value > 0) {
				  vslider=value;
				  update_hist(vslider);}}));
	    }
	    else {
		//Defined yAxis
		yscale.domain([maxYkde, 0]).nice();
		yAxis.scale(yscale);
		gyAxis.call(yAxis);

		const bandwidth = vslider;

		const update_kde = plot_kde(pdfgraph, data, bandwidth, xscale, yscale, x);

		//slider
		control.insert("p")
		    .attr("align", "center")
		    .text("Bandwidth");

		control.insert("svg")
		    .attr("width", wsvg)
		    .attr("height", hslider)
		    .append("g")
		    .attr("transform", "translate("+(wsvg-wslider)/2+",10)")
		    .call(d3
			  .sliderBottom()
			  .min(min_slider)
			  .max(max_slider)
			  .width(wslider)
			  .ticks(5, "s")
			  .default(vslider)
			  .fill("red")
			  .on("onchange", value => {
			      if (value > 0) {
				  vslider=value;
				  update_kde(vslider);}}));

	    };
	};

    });


};

var contents = null;
//BECHAMEL_CONTENTS//

if (contents == null)
    d3.json("outputs.json", render);
else
    render(contents);
}
