import _ from 'lodash';
import $ from 'jquery';
import * as d3 from 'd3';

import './style.css';

window.addEventListener('scroll', function(e) {
    console.log('Event worked');
});

$(document).ready(function() {
    $(window).scroll(function() {
        console.log('Event worked');
    });
});

function httpGetAsync(path) {
    return new Promise((resolve, reject) => {
        let xhr = new XMLHttpRequest();
        xhr.open('GET', 'https://min-api.cryptocompare.com/data/' + path, true);
        xhr.onload = function () {
            if (xhr.readyState == 4 && xhr.status >= 200 && xhr.status < 300) {
                resolve(JSON.parse(xhr.response));
            } else {
                reject({
                    status: xhr.status,
                    statusText: xhr.statusText
                });
            }
        };
        xhr.onerror = function () {
            reject({
                status: xhr.status,
                statusText: xhr.statusText
            });
        }
        xhr.send();
    });
}

function path(currency, bg_color, dark_color, index) {
    let area,
        background,
        canvas,
        container_width = window.innerWidth,
        container_height = (window.innerHeight - $('header').height()) / 3,
        crypto_daily,
        dash_line,
        dropdown =
        '<div class="more">' +
            '<a class="icon"><i></i></a>' +
            '<div class="dropdown hidden">' +
                '<ul>' +
                    '<li>high</li>' +
                    '<li>low</li>' +
                    '<li>open</li>' +
                    '<li>close</li>' +
                '</ul>' +
            '</div>' +
        '</div>',
        item,
        label,
        line,
        margin = {
            top: 0,
            right: 0,
            bottom: 0,
            left: '0',
        },
        scaleX,
        scaleY,
        svg_gradient,
        svg_height = container_height - margin.top - margin.bottom,
        svg_path,
        svg_width = container_width - margin.right - margin.left,
        symbol,
        transition = d3.transition()
            .duration(500),
        yAxis;

    item = d3.select('.path')
        .append('div')
        .attr('id', index + 'path')
        .attr('class', 'item');

    $('#' + index + 'path').append(dropdown);

    canvas = item.append('svg')
        .attr('height', svg_height)
        .attr('transform', "translate(0, 0)")
        .style('width', container_width);

    canvas.on('click', function() {
        if ($(this).hasClass('opened')) {
            d3.selectAll('svg').attr('class', '');
            $('.item').removeClass('hidden');
        } else {
            $(this).toggleClass('opened');
            d3.selectAll('svg:not(.opened)').attr('class', 'hidden');
            $('svg:not(.opened)').parent('.item').toggleClass('hidden');
        }
        updateChart();
    });

    $(document).on('click', function($event) {
        $('.dropdown').addClass('hidden');
    });

    $('#' + index + 'path .icon').on('click', function($event) {
        $(this).next('.dropdown').toggleClass('hidden');
        $event.stopPropagation();
    });

    item.selectAll('.dropdown li').on('click', function() {
        updateChart(this.textContent);
    });


    /*$('.item').on('mousemove', function($event) {
        console.log($event.originalEvent.clientX, $event.originalEvent.clientY);
    });*/

    httpGetAsync('histohour?fsym=' + currency + '&tsym=EUR')
        .then( function (response) {
            crypto_daily = response;
            generateChart();
        })
        .catch(function (err) {
            console.error('Augh, there was an error!', err);
        });

    function customYAxis(g) {
        g.call(yAxis);
        g.select(".domain").remove();
        g.selectAll(".tick:not(:first-of-type) line").attr("stroke", "#000").attr('stroke-width', '0.5');
        g.selectAll(".tick text").attr("x", 4).attr("dy", -4);
    }

    function generateChart() {
        let trading_value = 'high';

        // Create scales
        scaleX = d3.scaleTime()
            .domain([crypto_daily.Data[0].time, crypto_daily.Data[crypto_daily.Data.length - 1].time])
            .range([0, svg_width]);

        scaleY = d3.scaleLinear()
            .domain([0, d3.max(_.map(crypto_daily.Data, trading_value))])
            .range([svg_height, 25]);

        // Create axis in Y
        yAxis = d3.axisRight(scaleY)
            .ticks(5)
            .tickSize(window.innerWidth)
            .tickFormat(function(d) {
                return '€ ' + d;
            });

        // Create background
        background = canvas
            .append("rect")
            .attr('class', 'bg')
            .attr('width', svg_width)
            .attr('height', svg_height)
            .attr('fill', bg_color)
            .attr('stroke-width', 0);

        // Create gradient
        let gradient = canvas.append('defs')
            .append("linearGradient")
            .attr("id", index + "gradient")
            .attr("x1", 0)
            .attr("x2", 0)
            .attr("y1", 0)
            .attr("y2", "100%");
        gradient.append("stop")
            .attr("offset", .2)
            .style("stop-color", dark_color)
            .style("stop-opacity", .9);
        gradient.append("stop")
            .attr("offset", 1)
            .style("stop-color", dark_color)
            .style("stop-opacity", .2);

        // Create line chart & area
        area = d3.area()
            .x(function(d, k) { return k * 10; })
            .y0(svg_height)
            .y1(function(d) { return scaleY(d[trading_value]); });

        line = d3.line()
            .x(function(d, k) { return k * 10; })
            .y(function(d) { return scaleY(d[trading_value]); });

        svg_gradient = canvas.append('g')
            .selectAll('path')
            .data([crypto_daily.Data])
            .enter()
            .append('path')
            .attr('d', area)
            .attr('fill', 'url(#' + index + 'gradient)');

        svg_path = canvas.append('g')
            .selectAll('path')
            .data([crypto_daily.Data])
            .enter()
            .append('path')
            .attr('d', line)
            .attr('fill', 'none')
            .attr('fill-opacity', 0)
            .attr('stroke', 'white')
            .attr('stroke-opacity', 0.8)
            .attr('stroke-width', '1.30195px');

        // Create yAxis
        canvas.append("g")
            .attr('class', 'y-axis')
            .call(customYAxis);

        // Create dash line
        dash_line = canvas.append("g")
            .append("line")
            .attr("x1", container_width / 2)
            .attr("x2", container_width / 2)
            .attr("y1", 0)
            .attr("y2", svg_height)
            .style("stroke", 'white')
            .style("stroke-dasharray", 4)
            .style("stroke-opacity", 1);

        // Create label
        label = canvas.append("g")
            .attr('class', 'info');
        label.append('circle')
            .attr('cx', svg_width / 2)
            .attr('cy', svg_height / 2)
            .attr('r', 7)
            .attr('fill', '#000')
            .attr('stroke', 'white')
            .attr('stroke-width', '4');
        label.append('rect')
            .attr('width', '60')
            .attr('height', '30')
            .attr('x', (svg_width / 2) - 30)
            .attr('y', svg_height / 2 - 60)
            .attr('ry', 5)
            .attr('fill', 'rgba(0, 0, 0, .7');
        label.append('text')
            .attr('x', (svg_width / 2))
            .attr('y', (svg_height / 2) - 40)
            .attr('fill', 'white')
            .attr('text-anchor', 'middle')
            .text('test');

        // Create Crypto info
        symbol = item.append('div')
            .attr('class', 'symbol');
        symbol.style('color', dark_color);
        symbol.append('span')
            .text(currency + ': ');
        symbol.append('i')
            .style('color', '#000')
            .text(trading_value);
    }

    function updateChart(trading_value) {
        trading_value = trading_value || 'high';

        let height = $('#' + index + 'path svg').hasClass('opened') ?
            window.innerHeight - $('header').height() : svg_height;

        canvas.attr('height', height);

        // Update scaleY
        scaleY.range([height, 25]);

        // Update background
        background = canvas
            .select(".bg")
            .transition(transition)
            .attr('height', height)

        // Update area & line
        area = d3.area()
            .x(function(d, k) { return k * 10; })
            .y0(height)
            .y1(function(d) { return scaleY(d[trading_value]); });

        line = d3.line()
            .x(function(d, k) { return k * 10; })
            .y(function(d) { return scaleY(d[trading_value]); });

        svg_gradient.transition(transition)
            .attr('d', area);

        svg_path.transition(transition)
            .attr('d', line);

        // Update yAxis
        canvas.select(".y-axis")
            .call(customYAxis);

        // Update dash line & info label
        dash_line
            .transition(transition)
            .attr("y2", height);

        label.select('circle')
            .transition(transition)
            .attr('cy', height / 2);
        label.select('rect')
            .transition(transition)
            .attr('y', height / 2 - 60);
        label.select('text')
            .transition(transition)
            .attr('y', (height / 2) - 40);

        // Update trading value
        symbol.select('i')
            .text(trading_value);
    }
}


path('BTC', 'rgb(244, 143, 177)', 'rgb(192, 27, 62)', 0);
path('ETH', 'rgb(255, 175, 73)', 'rgb(255, 101, 58)', 1);
path('XRP', 'rgb(121, 134, 203)', 'rgb(45, 79, 172)', 2);