// https://developer.mozilla.org/en-US/docs/Web/API/File/Using_files_from_web_applications
document.getElementById("user-file").addEventListener("change", function() {
    var dataFile = this.files[0];
    var reader = new FileReader();

    // delete cards made before.
    if(document.getElementById("histogram-card")) document.getElementById("histogram-card").remove();

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
        
        for(i = 0; i < data.length/rowLen; i++) {
            dataArray.push(dstParser(data.slice(i*rowLen, (i+1)*rowLen)));
        }

        var maxYear = dataArray.reduce(function(prev, curr) {
            return curr.year > prev.year ? curr : prev;
        });
        var minYear = dataArray.reduce(function(prev, curr) {
            return curr.year < prev.year ? curr : prev;
        });

        var card = d3MakeCard("Dst Hisogram", "histogram-card", maxYear.year, minYear.year, dataArray);
        var month = document.getElementById("month").value;
        var year = document.getElementById("year").value;
        document.getElementById("month").addEventListener("change", function() {
            month = this.value;
            card.removeChild(document.getElementById("svg-container"));
            card.appendChild(d3MakeHistogram(year, month, dataArray));
        }, {passive: true});
        document.getElementById("year").addEventListener("change", function() {
            year = this.value;
            card.removeChild(document.getElementById("svg-container"));
            card.appendChild(d3MakeHistogram(year, month, dataArray));
        }, {passive: true});
        card.appendChild(d3MakeHistogram(year, month, dataArray));
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

// some problems appending child through functions. See this: https://github.com/d3/d3/issues/825
function d3MakeHistogram(year, month, dataArray) {
    var svgContainer = document.createElement("div");
    var monthData = dataArray.filter(d => d.year == year)
                             .filter(d => d.month == month);
    var w = 600;
    var h = 400;
    // make the svg element
    var svg = d3.create("svg")
                .attr("width", w)
                .attr("height", h);
    // make the histogram's bars
    svg.selectAll("rect")
       .data(monthData)
       .enter()
       .append("rect")
       .attr("x", (d, i) => i*w/monthData.length)
       .attr("y", d => h - Math.abs(d.meanValue*h/300))
       .attr("width", w/monthData.length - 1)
       .attr("height", d => Math.abs(d.meanValue*h/300))
       .attr("fill", d => "hsl(" +  Math.abs(d.meanValue*360/300) + " ,100%, 50%)");

    // make the histogram's label
    svg.selectAll("text")
       .data(monthData)
       .enter()
       .append("text")
       .text(d => Math.abs(d.meanValue))
       .attr("x", (d, i) => i*w/monthData.length+2)
       .attr("y", d => h - Math.abs(d.meanValue*h/300)-5)
       .attr("font-family", "sans-serif")
       .attr("font-size", "0.7em")
       .attr("fill", d => "#333");

    svgContainer.setAttribute("id", "svg-container");
    svgContainer.appendChild(svg.node());
    return svgContainer;
}

function d3MakeCard(title, id, maxYear, minYear, dataArray) {
    var card = d3.select("main").append("div").attr("class", "card").attr("id", id);
    
    card.append("h3").text(title);
    document.getElementById(id).appendChild(d3MakeInput(maxYear, minYear, dataArray));
    card.append("hr");

    return document.getElementById(id);
}

function d3MakeInput(maxYear, minYear, dataArray) {
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

    var monthList = d3.create("select").attr("id", "month");
    var yearList = d3.create("select").attr("id", "year");
    var i = 0;
    
    for(i = 1; i <= 12; i++) {
        if(1 == i) {
            monthList.append("option").attr("selected", "selected").attr("value", i).text(months[i-1]);
        }
        else {
            monthList.append("option").attr("value", i).text(months[i-1]);
        }
    }
    for(i = minYear; i <= maxYear; i++) {
        yearList.append("option").attr("value", i).text(i);
    }

    var inputDiv = document.createElement("div"); //d3.create("div").attr("id", "inputs-container");
    inputDiv.setAttribute("id", "inputs-container");
    inputDiv.appendChild(monthList.node());
    inputDiv.appendChild(yearList.node());

    return inputDiv;
}