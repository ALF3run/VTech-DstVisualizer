window.onload = ajaxCall("https://raw.githubusercontent.com/ALF3run/VTech-DstVisualizer/beta/data/Dst_data-2000_to_2018.dat");

document.getElementById("user-file").addEventListener("change", function() {
    var dataFile = this.files[0];
    var reader = new FileReader();

    document.getElementById("upload-alert").innerText = "";
    // reader.onload is used to execute operations on the file after it is 
    // loaded and passed to one of the "readAs..." functions. Reference:
    // https://developer.mozilla.org/en-US/docs/Web/API/FileReader/onload
    reader.onload = function(event) {
        var data = event.target.result;

        onloadFile(data);
    }
    reader.readAsText(dataFile);
});

function ajaxCall(fname){
    var xmlhttp;
    xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = function(){
        if(xmlhttp.readyState == 4 && xmlhttp.status == 200)
            onloadFile(xmlhttp.responseText);
    }
    xmlhttp.open("GET",fname,true);
    xmlhttp.send();
}

function onloadFile(data) {
    var dataArray = [];
    var i = 0;
    var rowLen = 121;

    // check for file format
    if("DST" != data.slice(0, 3) && "\n" != data.slice(rowLen)) {
        document.getElementById("upload-alert").innerText = "WARNING: wrong file format.";
        return false;
    }
    
    // extract data
    for(i = 0; i < data.length/rowLen; i++) {
        dataArray.push(dstParser(data.slice(i*rowLen, (i+1)*rowLen)));
    }
    var maxYear = dataArray.reduce(function(prev, curr) {
        return curr.year > prev.year ? curr : prev;
    });
    var minYear = dataArray.reduce(function(prev, curr) {
        return curr.year < prev.year ? curr : prev;
    });

    // initialize month and year inputs
    yearRange(minYear.year, maxYear.year, dataArray);
    monthRange(minYear.year, dataArray);
    var yearInput = document.getElementById("year");
    var monthInput = document.getElementById("month");

    // initialize charts
    histogram(getInputData(dataArray, "month"));
    orbit(monthInput.value);

    // add input listeners and update charts
    yearInput.addEventListener("change", function() {
        monthRange(this.value, dataArray);
        histogram(getInputData(dataArray, "month"));
        moveEarth(monthInput.value);
    }, {passive: true});
    monthInput.addEventListener("change", function() {
        histogram(getInputData(dataArray, "month"));
        moveEarth(this.value);
    }, {passive: true});
}

function dstParser(dataRow) {
    var i = 0;
    var dstDay = {
        year: Number(dataRow.slice(14, 16) + dataRow.slice(3, 5)),
        month: Number(dataRow.slice(5, 7)),
        day: Number(dataRow.slice(8, 10)),
        baseValue: Number(dataRow.slice(16, 20).trim()),
        hourlyValue: (function(dataRow) {
            var arrValue = [];

            for(i = 0; i < 24; i++) {
                arrValue.push(Number(dataRow.slice(i*4+16, (i+1)*4+16).trim()));
            }
            return arrValue;
        })(dataRow),
        meanValue: Number(dataRow.slice(116).trim())
    }

    return dstDay;
}

function getInputData(dataArray, timeRange, day = 0) {
    var yearInput = document.getElementById("year").value;
    var monthInput = document.getElementById("month").value;
    var yearData   = dataArray.filter(d => d.year == yearInput);
    var monthData  = yearData.filter(d => d.month == monthInput);
    var dayData    = monthData.filter(d => d.day == day);

    switch(timeRange) {
                             // Array of objects
        case "year" : return yearData;
        case "month": {
            // Array of dst mean value for the months
            monthData = monthData.map(d => d.meanValue)
            return monthData
        }
                             // Array of dst hourly value for the selected day
        case "day"  : return dayData[0].hourlyValue;
        default     : console.warn("Unrecognized argument timeRange in function getInput(). timeRange accepted value are 'year', 'month' and 'day'");
    }
}

function histogram(data) {
    var w = document.getElementById("histogram-chart").width.baseVal.value - 22;
    var h = document.getElementById("histogram-chart").height.baseVal.value - 22;

    // setup the scales
    var xScale = d3.scaleLinear()
                   .domain([1, data.length])
                   .rangeRound([30, w-10]);
    var yScale = d3.scaleLinear()
                   .domain(d3.extent(data, d => d))
                   .rangeRound([40, h-20]);
    var cScale = d3.scaleLinear()
                   .domain([-300, 100])
                   .rangeRound([0, 240]);

    // setup histogram axis
    var xAxis = d3.axisBottom()
                  .scale(xScale)
                  .ticks(31);
    var yAxis = d3.axisLeft()
                  .scale(yScale);

    // clear histogram
    d3.select("#histogram-chart")
      .selectAll("rect")
      .remove();
    d3.select("#histogram-chart")
      .selectAll("text")
      .remove();
    d3.select("#histogram-chart")
      .selectAll("g")
      .remove();
    
    // make histogram bars
    d3.select("#histogram-chart")
      .selectAll("rect")
      .data(data)
      .enter()
      .append("rect")
      .attr("x", (d, i) => xScale(i) + 11)
      .attr("y", h)
      .attr("width", Math.floor(w/data.length) - 3)
      .attr("height", d => h - yScale(d))
      .attr("fill", d => "hsl(" +  cScale(d) + ", 100%, 50%)")
      .transition()
      .duration(500)
      .attr("y", d => yScale(d));

    // make histogram labels
    d3.select("#histogram-chart")
      .selectAll("text")
      .data(data)
      .enter()
      .append("text")
      .text(d => d)
      .attr("x", (d, i) => xScale(i) + 11)
      .attr("y", h-5)
      .attr("font-family", "sans-serif")
      .attr("font-size", "0.5em")
      .attr("fill", d => "#333")
      .transition()
      .duration(500)
      .attr("y", d => yScale(d) - 5);

    // make histogram axis
    d3.select("#histogram-chart")
      .append("g")
      .attr("class", "axis")
      .attr("transform", "translate("+ (11 + (-((w/data.length) + 3)/2)) +", " + h + ")")
      .call(xAxis);

    d3.select("#histogram-chart")
      .append("g")
      .attr("class", "axis")
      .attr("transform", "translate(" + 22 + ", 0)")
      .call(yAxis);

    // make histogram axis labels
    d3.select("#histogram-chart")
      .append("text")
      .attr("class", "axis-label")
      .attr("x", w)
      .attr("y", h)
      .text("[Days]");

    d3.select("#histogram-chart")
      .append("text")
      .attr("class", "axis-label")
      .attr("x", 0)
      .attr("y", 30)
      .text("[1 nT]");
}

function orbit(month) {
    // data from https://en.wikipedia.org/wiki/Earth%27s_orbit#Events_in_the_orbit
    // aphelion, perihelion, semymajor axis, eccentricity, semiminor axis
    var aph  = 1.0167;
    var per  = 0.98329;
    var smax = 1.000001018;
    var e    = 0.0167086;
    var smin = Math.sqrt(smax**2 - (smax*e)**2);
    // body radius in AU: 1 AU = 149597870.7 km
    var earthR = 6371/149597870.7;
    var sunR   = 695700/149597870.7;
    // get svg size
    var w = document.getElementById("orbit-chart").width.baseVal.value;
    var h = document.getElementById("orbit-chart").height.baseVal.value;
    // get scale coefficient
    var kx = (w - 20)/(2*smax);
    var ky = (h - 20)/(2*smin);

    // clear orbit
    d3.select("#orbit-chart")
      .selectAll("ellipse")
      .remove()
    d3.select("#orbit-chart")
      .selectAll("circle")
      .remove()
    d3.select("#orbit-chart")
      .selectAll("text")
      .remove()

    // make orbit
    d3.select("#orbit-chart")
      .append("ellipse")
      .attr("cx", w/2)
      .attr("cy", h/2)
      .attr("rx", kx*smax)
      .attr("ry", ky*smin)
      .attr("stroke-width", 1)
      .attr("stroke", "#eee")
      .attr("fill", "rgba(0,0,0,0)");

    d3.select("#orbit-chart")
      .append("text")
      .text("P")
      .attr("x", w/2+kx*smax-20)
      .attr("y", h/2)
      .attr("font-family", "sans-serif")
      .attr("font-size", "0.7em")
      .attr("fill", d => "#eee");

    d3.select("#orbit-chart")
      .append("text")
      .text("A")
      .attr("x", w/2-kx*smax+20)
      .attr("y", h/2)
      .attr("font-family", "sans-serif")
      .attr("font-size", "0.7em")
      .attr("fill", d => "#eee");

    d3.select("#orbit-chart")
      .append("circle")
      .attr("cx", w/2+kx*(smax-per))
      .attr("cy", h/2)
      .attr("r", 10*Math.sqrt(kx**2+ky**2)*sunR)
      .attr("stroke-width", 10*Math.sqrt(kx**2+ky**2)*sunR/3)
      .attr("stroke", "#fc0")
      .attr("fill", "#f90");
    
    d3.select("#orbit-chart")
      .append("circle")
      .attr("cx", w/2+kx*smax*Math.cos(Math.PI/6*(month-1)))
      .attr("cy", h/2+ky*smin*Math.sin(Math.PI/6*(month-1)))
      .attr("r", 400*Math.sqrt(kx**2+ky**2)*earthR)
      .attr("stroke-width", 400*Math.sqrt(kx**2+ky**2)*earthR/3)
      .attr("stroke", "green")
      .attr("fill", "aqua")
      .attr("id", "earth");
}

function moveEarth(month) {
    // data from https://en.wikipedia.org/wiki/Earth%27s_orbit#Events_in_the_orbit
    // semymajor axis, eccentricity, semiminor axis
    var smax = 1.000001018;
    var e    = 0.0167086;
    var smin = Math.sqrt(smax**2 - (smax*e)**2);
    // get svg size
    var w = document.getElementById("orbit-chart").width.baseVal.value;
    var h = document.getElementById("orbit-chart").height.baseVal.value;
    // get scale coefficient
    var kx = (w - 20)/(2*smax);
    var ky = (h - 20)/(2*smin);

    d3.select("#earth")
      .transition()
      .ease(d3.easeLinear)
      .attr("cx", w/2+kx*smax*Math.cos(Math.PI/6*(month-1)))
      .attr("cy", h/2+ky*smin*Math.sin(Math.PI/6*(month-1)));
}

function yearRange(minYear, maxYear, dataArray) {
    // clear year input list
    d3.select("#year")
      .selectAll("option")
      .remove();

    // update the year input list
    for(i = minYear; i <= maxYear; i++) {
        d3.select("#year").append("option").attr("value", i).text(i)
    }
}

function monthRange(year, dataArray) {
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var dataMonths = dataArray.filter(d => d.year == year);
    var minMonth = dataMonths[0]['month'];
    var maxMonth = dataMonths[dataMonths.length-1]['month'];
    var i = 0;

    months = months.slice(minMonth-1, maxMonth);
    
    // clear month input list
    d3.select("#month")
      .selectAll("option")
      .remove()

    // update the month input list
    for(i = 0; i < maxMonth-minMonth+1; i++) {
        d3.select("#month").append("option").attr("value", i+minMonth).text(months[i]);
    }
}