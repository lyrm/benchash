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
//            kde : [ v: float ] (optional)
//            result: { estimate: float, r_square: float (optional) } }
//
// point := { x : double,
//            y : double }
//
// xLabel and yLabel are the same for any tests
window.onload = function () {

const wsvg = 600;
const hsvg = 400;
const wslider = 200;
const hslider = 50;
const margin = {left:50,right:50,top:20,bottom:50};
const dotSize = 1.5;
const innerW = wsvg-(margin.left+margin.right);
const innerH = hsvg-(margin.top+margin.bottom);

const marginbar = {left:150,right:150,top:50,bottom:50};
const wbar = 900;
const innerWbar = wbar-(marginbar.left+marginbar.right);

const SQRT_2PI = Math.sqrt(2 * Math.PI);

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

    // First step : check if there is no kde/histogram data at all in
    // the benchmarks, in which case, we want to reduce our layout to
    // one column.
    let nonempty_kde = false;
    inputs.series.forEach(function (serie) {
	if ('kde' in serie) {
	    nonempty_kde = nonempty_kde || true;} });
    const nb_col = nonempty_kde ? 2 : 1;

    // ************************************************ //
    //              Layout of the page                  //
    // ************************************************ //
    // + a summarize bar graph on top
    // + one section for each benchmark which includes
    //     * 1 title
    //     * 1 linear regression graph and its title and information table
    //     * if kde data are available a histogram/kde graph with its control panel.
    //
    // If none of the benchmarks has kde data, the layout is the same
    // but with only one column (no hist/kde graphs).
    //
    //
    //              c1:        c2:
    //
    // r1:            *title*
    //           ___________________
    // r2:      |   summarize bar   |
    //          |___________________|
    //
    // r3:           *title-1*
    //
    // r4:        *title*   *radio*
    //           _______     _______
    // r5:      | lr-1  |   | kde-1 |
    //          |_______|   |_______|
    //
    // r6:      *infos-1*   *slider-1*
    // ..
    // r(4i+3):       *title-i*
    //
    // r(4i+4):  *title*     *radio*
    //           _______     _______
    // r(4i+5): | lr-i  |   | kde-i |
    //          |_______|   |_______|
    //
    // r(4i+6): *infos-i*   *slider-i*
    //
    // etc ..

      const main = d3.select("body")
	  .append("div")
	    .attr("class", "wrapper")
	    .style("grid-template-columns", (nonempty_kde ? "repeat(2,"+wsvg+"px)" : "900px"))
	    .attr("id", "main");

    // ************************************************ //
    //              Summarize bar graph                 //
    // ************************************************ //

    // Title
    main.append("div")
   	  .style("grid-row", "1")
      	.style("grid-column", "1 / "+(nb_col+1))
  	  .attr("class", "summarizeTitle")
  	.text("Benchmarks summary");

    // Bar graph
    let bar_container = main
	.append("div")
   	  .style("grid-row", "2")
      	  .style("grid-column", "1 / "+(nb_col+1))
	  .attr("id", "bar");
    plot_summarize_bar_graph(bar_container, inputs);


    // ************************************************ //
    //              Layout for lr/kde graphs            //
    // ************************************************ //

    // Benchmark titles
    const titles = main
	  .selectAll(".mainTitle")
	  .data(inputs.series)
	  .enter()
	  .append("div")
	    .attr("id", (data, i) => "title-"+i)
   	    .style("grid-row", (data,i) =>""+(4*i+3))
      	    .style("grid-column", "1 / "+(nb_col+1))
  	    .attr("class","mainTitle")
	  .append("text")
  	    .attr("x", wsvg)
  	    .attr("y", margin.top-10)
            .text((data, i) => "#"+data.name);

    // Linear regression graph titles
    const titles_lr = main
	  .selectAll("#title_lr")
	  .data(inputs.series)
	  .enter()
	  .append("div")
            .attr("id",  "title_lr")
   	    .style("grid-row", (data,i) =>""+(4*i+4))
   	    .style("grid-column", "1")
	  .append("text")
  	    .attr("class","chartTitle")
  	    .text("Linear regression");

    // Containers for linear regression graphs
    const lr_graphs = main
	  .selectAll(".lr")
	  .data(inputs.series)
	  .enter()
	  .append("div")
            .attr("class", "lr")
	    .attr("id", (data, i) => "linearRegression-"+i)
   	    .style("grid-row", (data,i) =>""+(4*i+5))
   	  .style("grid-column", "1");

    // Containers for linear regression info tables
    const lr_info = main
	  .selectAll(".lr-info")
	  .data(inputs.series)
	  .enter()
	  .append("div")
            .attr("class", "lr-info")
	    .attr("id", (data, i) => "lr-info-"+i)
   	    .style("grid-row", (data,i) =>""+(4*i+6))
            .style("grid-column", "1");

    let radio_div, kde_graphs, kde_controler;
    if (nonempty_kde) {
	// Containers for radio buttons to choose between histogram/kde plots
	radio_div = main
	      .selectAll(".radio_div")
	      .data(inputs.series)
	      .enter()
	      .append("div")
              .attr("class",  "radio")
	      .attr("id", (d, i) => "radio_div"+i)
   	      .style("grid-row", (data,i) =>""+(4*i+4))
   	      .style("grid-column", "2");

	// Containers for kde/hist graph
	kde_graphs = main
	      .selectAll(".kde")
	      .data(inputs.series)
	      .enter()
	      .append("div")
              .attr("class", "kde")
	      .attr("id", (data, i) => "histKde-"+i)
   	      .style("grid-row", (data,i) =>""+(4*i+5))
   	      .style("grid-column", "2");

	// Containers for kde/hist controlers
	kde_controler = main
	      .selectAll(".kde-controler")
	      .data(inputs.series)
	      .enter()
	      .append("div")
              .attr("class", "kde-controler")
	      .attr("id", (data, i) => "kde-controler-"+i)
   	      .style("grid-row", (data,i) =>""+(4*i+6))
              .style("grid-column", "2");
    }

    // ************************************************ //
    //          Linear regression graph                 //
    // ************************************************ //
    lr_graphs.each( function(serie, i) {
	//Curves for each input
	const xMin = 0;
	const xMax = d3.max(serie.dataset, d => d.x);
	const yMin = 0;
	const yMax = d3.max(serie.dataset, d => d.y);

	// Define x axis
	const xScale = d3.scaleLinear()
  	      .domain([xMin,xMax])
  	      .range([0,innerW])
  	      .nice();
	const xAxis = d3.axisBottom()
  	      .scale(xScale)
  	      .ticks(8, "s");
	// "s" = number format such as 1000 -> 1k

	// Define y axis
	const yScale = d3.scaleLinear()
  	      .domain([yMin,yMax])
  	      .range([innerH,0])
  	      .nice();
	const yAxis = d3.axisLeft()
  	      .scale(yScale)
  	      .ticks(8, "s");

	// Svg
  	const plot = d3.select(this)
	    .append("svg")
  	      .attr("width",wsvg)
  	      .attr("height",hsvg);
	// Color background
	plot.append("rect")
  	    .attr("x",margin.left)
  	    .attr("y",margin.top)
  	    .attr("width",innerW)
  	    .attr("height",innerH)
  	    .attr("class","background axis");
	// Plot axis
	plot.append("g")
  	    .attr("transform",
	 	  "translate("+margin.left+","
	 	  +(hsvg-margin.bottom)+")")
	    .attr("class", "axis")
  	    .call(xAxis);
	plot.append("g")
  	    .attr("transform",
	  	  "translate("+margin.left+","
		  +margin.top+")")
	    .attr("class", "axis")
  	    .call(yAxis);
	// Print axis titles
	plot.append("text")
	    .attr("class", "axisTitle")
	    .attr("x", wsvg/2)
	    .attr("y", hsvg-10)
	    .text(inputs.xLabel);
	plot.append("text")
	    .attr("class", "axisTitle ytitle")
	    .attr("transform-origin", 0, hsvg/2)
	    .attr("x", 0)
	    .attr("y", hsvg/2)
	    .text(inputs.yLabel);

	// Plot data
	plot.append("g")
	    .attr("transform",
		  "translate("+margin.left+","
		  +margin.top+")")
  	    .selectAll("circle")
  	    .data(serie.dataset)
  	    .enter()
  	    .append("circle")
	    .attr("class", "circle")
  	    .attr("r", dotSize)
  	    .attr("cx", d => xScale(d.x))
  	    .attr("cy", d => yScale(d.y));

	// Plot linear regression line

	const xVals = serie.dataset.map((e,j) => e.x);
	const yVals = serie.dataset.map((e,j) => e.y);
	const pairs = [];
	xVals.forEach((d,i) => pairs.push([xVals[i],yVals[i]]));
	const linReg = ss.linearRegression(pairs);
	const linRegLine = ss.linearRegressionLine(linReg);
	let line = plot
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

	// Add text boxes
	//const meanX = ss.mean(xVals).toFixed(0);
	//const meanY = ss.mean(yVals).toFixed(2);
	//const varX = ss.sampleVariance(xVals).toFixed(0);
	//const varY = ss.sampleVariance(yVals).toFixed(1);
	//const corCoeff = ss.sampleCorrelation(xVals,yVals).toFixed(3);

	const lr_results = [
	    ["Linear regression line", "y = "+linReg.b.toFixed(2)+" + "+linReg.m.toFixed(3)+"x"],
	    ["Coefficient", serie.result.estimate],
	    ["R²", serie.result.r_square]
	];

	const sampling_to_string = sampling =>
              (Number.isInteger(sampling) ?  "`Linear "+sampling+"" : "`Geometric "+sampling+"");

	const format = v  => d3.format("s")(v);

	const param_benchmarks = [
	    ["LR sampling (sampling)", sampling_to_string(serie.description.sampling)],
	    ["Start (start)", serie.description.start],
	    ["Benchmark runtime (time / quota)",
	     format(serie.description.time) + " / " + format(serie.description.quota)],
	    ["Number of runs (samples)", serie.description.samples + " / " + serie.description.run],
	    ["Stabilized GC (stabilize)", serie.description.stabilize]
	];

	const table = d3.select("#lr-info-"+i)
	      .append("table");

	table.append("thead")
	    .append("tr")
	    .append("th")
	    .attr("colspan", 2)
	    .attr("scope", "col")
	    .text("Linear regression results");

	table.append("tbody")
	    .selectAll("tr")
	    .data(lr_results)
	    .enter()
	    .append("tr")
	    .selectAll("td")
	    .data(d => d)
	    .enter()
	    .append("td")
	    .text(d=>d);

	table.append("thead")
	    .append("tr")
	    .append("th")
	    .attr("class", "tooltip")
	    .attr("colspan", 2)
	    .attr("scope", "col")
	    .text("Benchmarks parameters")
	    .append("span")
	    .attr("class","tooltiptext")
	    .text("See [Benchmarks.stats]");

	table.append("tbody")
	    .selectAll("tr")
	    .data(param_benchmarks)
	    .enter()
	    .append("tr")
	    .selectAll("td")
	    .data(d => d)
	    .enter()
	    .append("td")
	    .text(d=>d);

    });

    // ************************************************ //
    //         Histogram and kde graphs                 //
    // ************************************************ //
    if (nonempty_kde) {
        kde_graphs.each(function (serie, i) {

	    // Svg for histogram and kde graphs
	    let pdfgraph = d3.select(this)
		.append("svg")
		.attr("id", "pdfgraph")
		.attr("width", wsvg)
		.attr("height", hsvg)
		.append("g")
		.attr("transform", "translate("+margin.left+","+margin.top+")");

	    // If there is no kde field in the data [serie], some note
	    // is written in the svg window.
	    if (!('kde' in serie)) {
		pdfgraph.append("text")
		    .attr("x", wsvg/2)
		    .attr("y", hsvg/2)
		    .attr("class", "warningtext")
		    .text("No available data");
	    } else if (d3.max(serie.kde) == d3.min(serie.kde)) {
		pdfgraph.append("text")
		    .attr("x", wsvg/2)
		    .attr("y", hsvg/2)
		    .attr("class", "warningtext")
		    .text("All data have same value.");
	    } else {
		const data = serie.kde;
		//Some default values
		const min_slider = (d3.max(data)-d3.min(data))/data.length;
		const max_slider = (d3.max(data)-d3.min(data))/30;
		let vslider = min_slider;

		//Radio buttons
		const form = d3.select("#radio_div"+i)
		      .append("form");

		form.append("input")
		    .attr("type", "radio")
		    .attr("name", "graph")
		    .attr("value", "hist"+i)
		    .attr("name", "graph")
		    .attr("checked", "checked")
		    .on("change", () => plot_chosen_graph(d3.select(this), "hist"));
		form.append("label")
		    .attr("for", "hist"+i)
		    .text("Histogram");
		form.append("input")
		    .attr("type", "radio")
		    .attr("value", "kde"+i)
		    .attr("name", "graph")
		    .on("change", () => plot_chosen_graph(d3.select(this), "kde"));
		form.append("label")
		    .attr("for", "kde"+i)
		    .text("KDE");

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
		for (let i=0; i<n; i++) { x[i] = xmin + i*(xmax-xmin)/n; }

		//Compute kde function for min bandwidth value to determine to determine
		//the max value of Y axis. Only happens one time when loading the webpage.
		const kde = kernelDensityEstimation(data, min_slider);
		const v = new Array(n);
		for (let i=0; i<n;i++){ v[i] = kde(x[i]);}
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
		const gxAxis = pdfgraph
	              .append("g")
	              .attr("transform","translate(0"+","+innerH+")")
	              .attr("class", "axis")
	              .call(xAxis);

		// y Axis
		const gyAxis = pdfgraph
	              .append("g")
	              .attr("class", "axis")
	              .call(yAxis);

		plot_chosen_graph(d3.select(this), "hist");

		function plot_chosen_graph(container, choice) {

		    let rects =
			container.selectAll(".bar").remove();

		    let path =
			container.select(".mypath").remove();

		    // Erasing control panels if it exists and initializing it
		    const control_container = d3.select("#kde-controler-"+i);
		    const slider = control_container.select("#slider-"+i);
		    const slidertitle = control_container.select("#slidertitle-"+i);
		    if (!slider.empty())  {
			slider.remove();
		    }
		    if (!slidertitle.empty())  {
			slidertitle.remove();
		    }

		    //Hist part
		    if (choice=="hist") {
			//Defined yAxis
			yscale.domain([maxYhist, 0]).nice();
			yAxis.scale(yscale);
			gyAxis.call(yAxis);

			const barwidth = vslider;

			const update_hist = plot_histogram(pdfgraph, data, barwidth, xscale, yscale);

			//slider
			control_container
			    .insert("p")
			    .attr("align", "center")
			    .attr("id", "slidertitle-"+i)
			    .text("Barwidth");

			control_container
			    .insert("svg")
			    .attr("width", wsvg)
			    .attr("height", hslider)
			    .attr("id", "slider-"+i)
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
				  .on("onchange", (value) => {
				      if (value > 0) {
					  vslider=value;
					  update_hist(vslider);}}));
		    } else {
			//Defined yAxis
			yscale.domain([maxYkde, 0]).nice();
			yAxis.scale(yscale);
			gyAxis.call(yAxis);

			const bandwidth = vslider;
			const update_kde = plot_kde(pdfgraph, data, bandwidth, xscale, yscale, x);

			//slider
			control_container.insert("p")
			    .attr("align", "center")
			    .attr("id", "slidertitle-"+i)
			    .text("Bandwidth");

			control_container.insert("svg")
			    .attr("width", wsvg)
			    .attr("height", hslider)
			    .attr("id", "slider-"+i)
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
				  .on("onchange", (value) =>
				      {if (value > 0) { vslider=value; update_kde(vslider);}}));
		    }; // end else
		}; // end function
	    }; //end else (available kde data)
	}); //end function // end each
    }; //end if



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
	.attr("width", serie => xb(serie.result.estimate))
	.attr("fill", "#4ECDC4")
	.on("mouseover", function (serie) {
	    // Specify where to put label of text
	    bargraph.append("text")
		.attr("class", "axisTitle")
		.attr("id", "tt")
		.attr("x", wbar-200)
		.attr("y", marginbar.top-10)
		.text("Value: "+d3.format(".4s")(serie.result.estimate));
	})
        .on("mouseout", function (serie) {
	    // Select text by id and then remove
	    d3.selectAll("#tt").transition().duration("50").remove();
	});

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
    const sample_nb = data.length;

    const print_value = function (v) {
	container.append("text")
	    .attr("class", "axisTitle")
	    .attr("id", "tt2")
	    .attr("x", wsvg-170)
	    .attr("y", 20)
	    .text("Value: "+d3.format("d")(v)+" / "+d3.format("d")(sample_nb));};

    const rects = container
	  .selectAll(".bar")
   	  .data(hist)
	  .enter();

    rects.append("rect")
	.attr("class", "bar")
	.attr("x", (v, i) => xscale(i*barwidth+min))
	.attr("width", (v, i) => xscale(barwidth)-xscale(0))
	.attr("y", (v, i) => yscale(v))
	.attr("height", (v, i) => innerH-yscale(v))
	.on("mouseover", print_value)
        .on("mouseout", () => d3.selectAll("#tt2").transition().duration("50").remove());

    function update_hist(nbarwidth) {
	//compute new histograph values
	const nhist = histogram(data, nbarwidth, min, max);

	const rects = container
	      .selectAll(".bar")
   	      .data(nhist);

	rects.exit().remove();

	rects.enter().append("rect").attr("class", "bar")
	    .merge(rects)
	    .attr("x", (v, i) => xscale(i*nbarwidth+min))
	    .attr("width", (v, i) => xscale(nbarwidth)-xscale(0))
	    .attr("y", (v, i) => yscale(v))
	    .attr("height", (v, i) => innerH-yscale(v))
	    .on("mouseover", print_value)
            .on("mouseout", () => d3.selectAll("#tt2").transition().duration("50").remove());
    }
    return update_hist;
};

// [kernelDensityEstimation(data, bandwith] returns the function x -> kde(x)
//    for [data]. The kernel function used is a gaussian.
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

    const graph = container
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

};


var contents = null;
//BECHAMEL_CONTENTS//

if (contents == null)
    d3.json("outputs.json", render);
else
    render(contents);
}
