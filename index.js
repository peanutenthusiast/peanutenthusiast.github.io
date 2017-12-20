$(document).ready(function() {
  let lat, long, width = $(document).width(), isMobile = width <= 425;
  const hitsIncrement = 5;

  navigator.geolocation.getCurrentPosition(function(location) {
    let coords = location.coords;
    lat = coords.latitude, long = coords.longitude;
  })

  if (!lat && !long) {
    $.getJSON('https://ipapi.co/json/', function(data) {
      lat = data.latitude, long = data.longitude;
    });
  }
  var applicationID = '4AD6LY9AIX';
  var apiKey = 'ebf8b682150cfb289074833722f833f8';
  var index = 'restaurants';
  var client = algoliasearch(applicationID, apiKey);
  var helper = algoliasearchHelper(client, index, {
    facets: ['food_type','payment_options'],
    disjunctiveFacets: ['stars_count'],
    maxValuesPerFacet: 7,
    hitsPerPage: hitsIncrement
  });

  var $facets = $('#facets');
  var $stars = $('#stars');
  var $hits = $('#hits');

  $facets.on("mouseenter", ".facet", function(e) {
    handleFacetHover(e);
  });

  $facets.on("mouseleave", ".active", function(e) {
    $(e.target).removeClass("active");
    var attribute = e.target.dataset.attribute;
    if (!attribute) return;
    helper.clearRefinements(attribute).search();
  })

  $stars.on("mouseenter", ".starline", function(e) {
    e.preventDefault();
    var value = parseInt($(this).attr("data-value"));
    if (!value || value === 5) return;
    helper.addNumericRefinement('stars_count', '>', value).search();
  })

  $stars.on("mouseleave", ".starline", function(e) {
    e.preventDefault();
    var value = $(this).attr("data-value");
    if (!value) return;
    helper.removeNumericRefinement('stars_count').search();
  })

  $hits.on("click", "#next", function(e) {
    e.preventDefault();
    let currHitsPerPage = helper.getQueryParameter('hitsPerPage');
        currHitsPerPage += hitsIncrement;
    helper.setQueryParameter('hitsPerPage', currHitsPerPage).search();
  })

  helper.on('result', function(content) {
    renderHits(content);
    renderFacets($facets, content);
    renderRatings($stars);
  });

  function renderHits(content) {
    $('#hits').html(function() {
      let summary = `<div id="summary"><p><b>${content.hits.length} results found in</b> ${content.processingTimeMS / 1000} seconds</p><div id="spacer"></div></div>`;
      let results = $.map(content.hits, function(hit) {
        const {name, reviews_count, food_type, neighborhood, price_range, image_url, reserve_url, mobile_reserve_url} = hit._highlightResult;
        const url = isMobile ? mobile_reserve_url.value : reserve_url.value;
        const restN = `<a href="${url}"><h4 class="restN">` + name.value + '</h4></a>';
        const image = `<div class="restaurant"><img src=${image_url.value} class="image"></div>`;
        const rating = `<div class="rating-info"><span class="rating">${hit.stars_count}` + renderStars(Math.floor(hit.stars_count)) + "</span>" + `<p class="reviews">(${reviews_count.value} reviews)</p></span></div>`;
        const shortInfo = '<p>' + [food_type.value, neighborhood.value, price_range.value].join(' | ') + '</p>';
        return '<div class="hit">' + image + "<div class='details'>" + restN + rating + shortInfo + '</div></div>';
      });
        return summary + `${results.join('')}` + '<button id="next">Show More</button>';
    });
  }

  const renderStars = num => {
    let stars = [];

    for (var i = 0; i <= 4; i++) {
      let starUrl = i < num ? './graphics/stars-plain.png' : './graphics/star-empty.png';
      stars.push(`<img src=${starUrl} class="star">`);
    }
    return stars.join('');
  }

  const renderRatings = ($stars) => {
    let ratings = [], max = 5;
    for (var z = 0; z <= max; z++) {
      ratings.push(`<li class="starline" data-value="${z}">` + renderStars(z) + "</li>");
    }
    $stars.html('<h4>Ratings</h4>' + "<ul>" + ratings.join('') + "</ul>");
  }

  function renderFacets($facets, results) {
    var facets = results.facets.map(function(facet, index) {
      var name = facet.name;
      var header = '<h4>' + name.split("_").map(word => { return word.charAt(0).toUpperCase() + word.slice(1); }).join(" ") + '</h4>';
      var facetValues = results.getFacetValues(name);
      var facetsValuesList = $.map(facetValues, function(facetValue) {
        var valueAndCount = '<td data-attribute="' + name + '" data-value="' + facetValue.name + `" class="facet ${name}">` + facetValue.name + "</td><td class='numbers'>" + facetValue.count + '</td>';
        return '<tr>' + valueAndCount + '</tr>';
      })
      return `<div class="facet-${index}">` + header + '<table>' + facetsValuesList.join('') + '</table>' + "</div";
    });
    
    $facets.html(facets.join(''));
  }

  $('#search-box').on('keyup', function() {
    helper.setQuery($(this).val()).setQueryParameter('aroundLatLng', `${lat}, ${long}`)
          .search();
  });

  function handleFacetHover(e) {
    e.preventDefault();
    var target = e.target;
    $(target).addClass("active");
    var attribute = target.dataset.attribute;
    var value = target.dataset.value;
    if(!attribute || !value) return;
    if (!helper.hasRefinements(attribute, value)) {
      helper.toggleRefine(attribute, value).search();
    }
  }

  helper.search();  
})