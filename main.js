$(function () {
    var map,
        glLayer,
        d3Layer,
        uiLayer,
        svg,
        renderer,
        line,
        data,
        records,
        unemployment,
        density,
        missy,
        amy,
        jen,
        // tracts,
        colorBy = 'Region';

    queue()
        .defer(d3.json, "us-zipcodes-simplified-10m-unmerged.json")
        .defer(d3.json, "records.json")
        .defer(d3.csv, "Unemployment+Unsorted.csv")
        .defer(d3.csv, "Zipcode-ZCTA-Population-Density-And-Area-Unsorted.csv")
        .defer(d3.json, "missy.json")
        .defer(d3.json, "amy.json")
        .defer(d3.json, "jen.json")
        // .defer(d3.json, "tl_2010_36_tract10/tl_2010_36_tract10.json")
        .await(ready);

    colorByOptions = [
        'Region',
        'Unemp. Rate',
        'Density Per Sq Mile',
        'Land-Sq-Mi',
        'Families with single mom',
        'Families with single dad',
        'Families with husband/wife/children',
        'Households with 15-24 head',
        'Households with single mom',
        'Households with single dad',
        'Households',
        'Husband and wife households',
        'Population',
        'Population white',
        'Male under 5',
        'Household size',
        'Home owners with children',
        'Renters with children',
        'Household owners with children',
        'Households with children'
    ];

    d3.select('#colorby').selectAll('option')
        .data(colorByOptions)
        .enter().append('option')
        .attr('value', function (d) { return d; })
        .text(function (d) { return d;})

    $('#colorby').change(function () {
        colorBy = $('#colorby').val();
        render();
    });

    function resize() {
        map.resize(0, 0, $('#map').width(), $('#map').height());
    }

    map = geo.map({
        node: '#map',
        zoom: 5,
        center: {x: -75, y: 43}
    });
    map.createLayer('osm')

    glLayer = map.createLayer('feature');
    d3Layer = map.createLayer('feature', {renderer: 'd3Renderer'});
    uiLayer = map.createLayer('ui').createWidget('slider');

    svg = d3Layer.canvas();
    renderer = d3Layer.renderer();

    line = d3.geo.path().projection(function (c) {
        var d = renderer.worldToDisplay({
            x: c[0],
            y: c[1],
            z: 0
        });
        return [d.x, d.y];
    });

    function ready(error, dat, rec, unemp, den, mis, am, jn) {
        data = dat;
        records = rec;
        unemployment = unemp;
        density = den;
        missy = mis;
        amy = am;
        jen = jn;
        // tracts = tr;
        render();
    }

    function render() {
        var zipcodes,
            filtered = [],
            region = {},
            regionColor = d3.scale.category10(),
            recordMap = {},
            opacity,
            tractFeatures;

        missy.forEach(function (zip) {
            region[zip] = 1;
        });
        amy.forEach(function (zip) {
            region[zip] = 2;
        });
        jen.forEach(function (zip) {
            region[zip] = 3;
        });

        regionColor(1);
        regionColor(2);
        regionColor(4);
        regionColor(3);

        records.forEach(function (d) {
            recordMap[d['Zip code']] = d;
        });

        density.forEach(function (d) {
            if (recordMap[d['Zip/ZCTA']]) {
                recordMap[d['Zip/ZCTA']]['Density Per Sq Mile'] = d['Density Per Sq Mile'];
                recordMap[d['Zip/ZCTA']]['Land-Sq-Mi'] = d['Land-Sq-Mi'];
            }
        });

        unemployment.forEach(function (d) {
            if (recordMap[d.Zip]) {
                recordMap[d.Zip]['Unemp. Rate'] = d['Unemp. Rate'].split('%')[0];
            }
        });

        data.objects['zipcodes-simplified-unmerged'].geometries.forEach(function (d) {
            if (region[d.id] !== undefined) {
                filtered.push(d);
            }
        });

        data.objects['zipcodes-simplified-unmerged'].geometries = filtered;

        zipcodes = topojson.feature(data, data.objects['zipcodes-simplified-unmerged']).features;
        // tractFeatures = topojson.feature(tracts, tracts.objects.tl_2010_36_tract10).features;

        opacity = d3.scale.linear().domain(
            d3.extent(records, function (d) {
                return region[d['Zip code']] ? +d[colorBy] : undefined;
            })
        ).range(['white', 'red']);
        console.log(opacity.domain());

        zipcodes.forEach(function (d) {
            d.data = recordMap[d.id];
        });

        svg.selectAll('path.border').remove();

        svg.selectAll('path.border')
            .data(zipcodes)
            .enter()
            .append('path')
            .attr('d', function (d) { return line(d); })
            .classed('border', true)
            .style('fill', function (d) {
                if (colorBy === 'Region') {
                    return regionColor(region[d.id]);
                }
                return opacity(+d.data[colorBy]);
            })
            .style('opacity', 0.3)
            .style('stroke', 'black')
            .style('stroke-width', 1 / renderer.scaleFactor());

        // svg.selectAll('path.tracts').remove();
        // svg.selectAll('path.tracts')
        //     .data(tractFeatures)
        //     .enter()
        //     .append('path')
        //     .attr('d', function (d) { return line(d); })
        //     .classed('tracts', true)
        //     .style('fill', 'none')
        //     .style('opacity', 0.2)
        //     .style('stroke', 'black')
        //     .style('stroke-width', 1 / renderer.scaleFactor());

        renderer.layer().geoOn(geo.event.d3Rescale, function (arg) {
            arg = arg || {};
            arg.scale = arg.scale || 1;
            // d3.selectAll('path.tracts').style('stroke-width', 1 / arg.scale);
            d3.selectAll('path.border').style('stroke-width', 1 / arg.scale);
        });

        $(window).resize(resize);
        resize();
    }
});
