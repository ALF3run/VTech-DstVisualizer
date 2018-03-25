document.getElementById("user-file").addEventListener("change", function() {
    var dataFile = this.files[0];
    var reader = new FileReader();

    document.getElementById("upload-alert").innerText = "";
    // reader.onload is used to execute operations on the file after it is 
    // loaded and passed to one of the "readAs..." functions. Reference:
    // https://developer.mozilla.org/en-US/docs/Web/API/FileReader/onload
    reader.onload = function(event) {
        var data = event.target.result;
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

        // initialize month and year inputs and histogram
        yearRange(minYear.year, maxYear.year, dataArray);
        monthRange(minYear.year, dataArray);
        var yearInput = document.getElementById("year");
        var monthInput = document.getElementById("month");

        // initialize charts
        histogram(yearInput.value, monthInput.value, dataArray);

        // add input listeners and update charts
        yearInput.addEventListener("change", function() {
            monthRange(this.value, dataArray);
            histogram(this.value, monthInput.value, dataArray);
        }, {passive: true});
        monthInput.addEventListener("change", function() {
            histogram(yearInput.value, this.value, dataArray);
        }, {passive: true});
    }
    reader.readAsText(dataFile);
});

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

function histogram(year, month, dataArray) {
    var monthData = dataArray.filter(d => d.year == year)
                             .filter(d => d.month == month);
    var w = document.getElementById("histogram-chart").width.baseVal.value;
    var h = document.getElementById("histogram-chart").height.baseVal.value;

    // clear histogram
    d3.select("#histogram-chart")
      .selectAll("rect")
      .remove();
    d3.select("#histogram-chart")
      .selectAll("text")
      .remove();
    
    // make histogram bars
    d3.select("#histogram-chart")
      .selectAll("rect")
      .data(monthData)
      .enter()
      .append("rect")
      .attr("x", (d, i) => i*w/monthData.length)
      .attr("y", d => h - Math.abs(d.meanValue*h/300))
      .attr("width", w/monthData.length - 1)
      .attr("height", d => Math.abs(d.meanValue*h/300))
      .attr("fill", d => "hsl(" +  Math.abs(d.meanValue*360/300) + ", 100%, 50%)");

    // make histogram labels
    d3.select("#histogram-chart")
      .selectAll("text")
      .data(monthData)
      .enter()
      .append("text")
      .text(d => Math.abs(d.meanValue))
      .attr("x", (d, i) => i*w/monthData.length+2)
      .attr("y", d => h - Math.abs(d.meanValue*h/300)-5)
      .attr("font-family", "sans-serif")
      .attr("font-size", "0.5em")
      .attr("fill", d => "#333");
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

    months = months.slice(minMonth-1, maxMonth);
    
    // clear month input list
    d3.select("#month")
      .selectAll("option")
      .remove()

    // update the month input list
    for(i = minMonth-1; i < maxMonth; i++) {
        d3.select("#month").append("option").attr("value", i+1).text(months[i]);
    }
}