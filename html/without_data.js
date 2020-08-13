const w = 600;
const h = 400;
const margin = {left:150,right:50,top:50,bottom:50};
const dotSize = 1.5;

const innerW = w-(margin.left+margin.right);
const innerH = h-(margin.top+margin.bottom);


   // structure of JSON
   // { xLabel: string,
   //   yLabel: string,
   //   series: [ tests ] }
   //
   // tests := { name: string,
   //            dataset: { ..., data: [ point ] },
   //            ols: { estimate: float, r_square: float (optional) } }
   //
   // xLabel and yLabel are the same for any tests

function render(inputs) {
    inputs.series.forEach(
	function(serie) {
	    serie.dataset.forEach(
		function(d) {
		    d.x = +d.x;
		    d.y = +d.y;
		}
	    );
	}
    );

    //Summary bar graph
    const hbar = d3.min([80*inputs.series.length, h]);
    const innerHbar = hbar - margin.top - margin.bottom;

    const xb = d3.scaleLinear()
	  .range([0, innerW])
	  .domain([0, d3.max(inputs.series, serie => serie.result.estimate)])
	  .nice();
    const yb = d3.scaleBand()
	  .range([0, innerHbar])
	  .padding(0.2)
	  .domain(inputs.series.map(serie => serie.name));
    const xbAxis = d3.axisBottom()
	  .scale(xb);
    const ybAxis = d3.axisLeft()
	  .scale(yb);
    const bar_div = d3.select("body")
	  .append("div")
	  .attr("class", "center")
	  .attr("id", "bar");
    var bars = d3.select("#bar")
	.append("svg")
	.attr("width", w)
	.attr("height", hbar);
    //background
    bars.append("rect")
  	.attr("x",margin.left)
  	.attr("y",margin.top)
  	.attr("width",innerW)
  	.attr("height",innerHbar)
  	.attr("class","background axis");
     //graph title
    bars.append("text")
  	.attr("class","chartTitle")
  	.attr("x",w/2)
  	.attr("y",margin.top-10)
  	.text("Benchmarks summary");
    // x Axis
    bars.append("g")
	.attr("transform","translate("+margin.left+","+(hbar-margin.bottom)+")")
	.attr("class", "axis")
	.call(xbAxis);
    //x axis title
    bars.append("text")
	.attr("class", "axisTitle")
	.attr("x", w/2)
	.attr("y", hbar-10)
	.text("Estimated "+inputs.yLabel);
    // y Axis
    bars.append("g")
	.attr("transform","translate("+margin.left+","+margin.bottom+")")
	.attr("class", "axis")
	.call(ybAxis);
    // Bars
    bars.append("g")
	.attr("transform","translate("+margin.left+","+margin.top+")")
	.selectAll(".bar")
   	.data(inputs.series)
	.enter().append("rect")
	.attr("class", "bar")
	.attr("y", serie => yb(serie.name))
	.attr("height", yb.bandwidth)
	.attr("x", serie => 0)
	.attr("width", serie => xb(serie.result.estimate));


    //Curves for each input
    const xMin = 0;
    const yMin = 0;
    const xMax =
	  d3.max(inputs.series,
		 serie => d3.max(serie.dataset, d => d.x));
    const yMax =
	  d3.max(inputs.series,
		 serie => d3.max(serie.dataset, d => d.y ));
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
  	  .ticks(10);
    const yAxis = d3.axisLeft()
  	  .scale(yScale)
  	  .ticks(10);
    const center = d3.select("body")
	  .append("div")
	  .attr("class", "center")
	  .attr("id", "bechamel");
    let plots = d3.select("#bechamel")
	.selectAll("svg")
  	.data(inputs.series)
	.enter()
  	.append("div")
	.attr("id", (d, i) => "bechamel-"+i )
  	.append("svg")
  	.attr("width",w)
  	.attr("height",h);
    //background
    plots.append("rect")
  	.attr("x",margin.left)
  	.attr("y",margin.top)
  	.attr("width",innerW)
  	.attr("height",innerH)
  	.attr("class","background axis");
    //graph title
    plots.append("text")
  	.attr("class","chartTitle")
  	.attr("x",w/2)
  	.attr("y",margin.top-10)
  	.text((d,i) => "# " + d.name);
    //x axis
    plots.append("g")
  	.attr("transform","translate("+margin.left+","+(h-margin.bottom)+")")
	.attr("class", "axis")
  	.call(xAxis);
    //x axis title
    plots.append("text")
	.attr("class", "axisTitle")
	.attr("x", w/2)
	.attr("y", h-10)
	.text(inputs.xLabel);
    //y axis
    plots.append("g")
  	.attr("transform","translate("+margin.left+","+margin.bottom+")")
	.attr("class", "axis")
  	.call(yAxis);
    //y axis title
    plots.append("text")
	.attr("class", "axisTitle ytitle")
	.attr("transform-origin", 0, h/2)
	.attr("x", 0)
	.attr("y", h/2)
	.text(inputs.yLabel);
    //data
    plots.append("g")
	.attr("transform","translate("+margin.left+","+margin.top+")")
  	.selectAll("circle")
  	.data(d =>  d.dataset)
  	.enter()
  	.append("circle")
	.attr("class", "circle")
  	.attr("r", dotSize)
  	.attr("cx", d => xScale(d.x))
  	.attr("cy", d => yScale(d.y));

    //Text boxes
    plots.each(function (d,i){
	const xVals = d.dataset.map((e,j) => e.x);
	const yVals = d.dataset.map((e,j) => e.y);
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
	    ["Coefficient", d.result.estimate],
	    ["R²", d.result.r_square]
	];
	d3.select("#bechamel-"+i)
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

	const sampling_to_string = function(sampling) {
            if (Number.isInteger(sampling)) {
		return "(`Linear "+sampling+")";
            } else {
		return "(`Geometric "+sampling+")";
            } };

	const new_line = "\n";

	d3.select("#bechamel-"+i)
	    .append("pre").append("code").attr("class", "ml hljs ocaml")
	    .text(c =>
		  "let samples = run ~start:"+d.description.start+new_line
                  +" ~sampling:"+sampling_to_string(d.description.sampling)+new_line
                  +" ~stabilize:"+d.description.stabilize+new_line
                  +" ~run:"+d.description.run+new_line
                  +" ~quota:"+d.description.quota+new_line
                  +" [ "+d.description.instances.join("; ")+" ]"
                  +" fn ;;"+new_line
                  +"val samples : (int * int64) = ("+d.description.samples+", "+d.description.time+")");

	let line = d3.select(this).append("line")
    	    .attr("transform","translate("+margin.left+","+margin.top+")")
    	    .attr("class","regLine")
    	    .attr("x1",xScale(xMin))
    	    .attr("x2",xScale(xMin))
    	    .attr("y1",yScale(linRegLine(xMin)))
    	    .attr("y2",yScale(linRegLine(xMin)));
	line.transition().duration(1000).delay(2000)
    	    .attr("x2",xScale(xMax))
    	    .attr("y2",yScale(linRegLine(xMax)));

	document.querySelectorAll('div code').forEach(block => hljs.highlightBlock(block));
    });
};

var contents = null;
//BECHAMEL_CONTENTS//

if (contents == null)
    d3.json("outputs.json", render);
else
    render(contents);
