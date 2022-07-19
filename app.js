//****************************************************************************************************************
            // SETUP THE LEAFLET MAP
//****************************************************************************************************************
// Map initialization 
var map = L.map('map').setView([14.0860746, 100.608406], 6);

//osm layer
var osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
});
osm.addTo(map);



//****************************************************************************************************************
            // SEARCH BUTTON AND CONNECTING TO GEOSERVER TO LOAD WFS LAYER
//****************************************************************************************************************
let gjLayer = null, bufLayer = null, place_name = '', url=null, bufs=[], data_gjson;

function loadLayer(){
    
    place_name = String(document.getElementById('place').value)
    let cqlf = `CQL_FILTER=name_of_th='${place_name}'`

    if(place_name != null){
        url = 'http://ec2-18-223-15-82.us-east-2.compute.amazonaws.com:8080/geoserver/AudioTour/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=AudioTour%3Atourist_locations&maxFeatures=50&outputFormat=application%2Fjson&' + cqlf;
    }
    if (place_name == ''){
        url = 'http://ec2-18-223-15-82.us-east-2.compute.amazonaws.com:8080/geoserver/AudioTour/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=AudioTour%3Atourist_locations&maxFeatures=50&outputFormat=application%2Fjson';
    }
    
    $.ajax({
        type: "GET",
        url: url,
        crossDomain: true,
        success: function(data)
        {   
            data_gjson = data
            if(gjLayer && map.hasLayer(gjLayer)){
                map.removeLayer(gjLayer);
            }
            if(bufLayer && map.hasLayer(bufLayer)){
                map.removeLayer(bufLayer);
            }
            gjLayer = L.geoJSON(data).addTo(map);
            bufs = [];
            for(let i=0;i<data.features.length;i++){
                bufs.push(turf.point(data.features[i].geometry.coordinates));
            }
            bufs = turf.featureCollection(bufs);
            bufs = turf.buffer(bufs, 0.05, {units: 'kilometers'});
            bufLayer = L.geoJSON(bufs).addTo(map);
        }
    });
}


//****************************************************************************************************************
            // TRACK USERS GEOLOCATION AND ADDED GEOFENCE TRIGGER
//****************************************************************************************************************
// TRACK GEOLOCATION
if(!navigator.geolocation) {
    console.log("Your browser doesn't support geolocation feature!")
} else {
    setInterval(() => {
        navigator.geolocation.getCurrentPosition(getPosition)
    }, 5000);
}

var marker, circle, currentLocation, polygon, currentIndex, previousIndex;

// FUNCTIONS FOR SPEECH SYNTHESIS
function textToSpeech(str){
    let utterance = new SpeechSynthesisUtterance(str);
    speechSynthesis.speak(utterance)
}

function getPosition(position){

    var lat = position.coords.latitude
    var long = position.coords.longitude
    var accuracy = position.coords.accuracy

    if(marker) {
        map.removeLayer(marker)
    }

    if(circle) {
        map.removeLayer(circle)
    }

    marker = L.marker([lat, long])
    circle = L.circle([lat, long], {radius: accuracy})

    var featureGroup = L.featureGroup([marker, circle]).addTo(map)

    map.fitBounds(featureGroup.getBounds())

    console.log("Your coordinate is: Lat: "+ lat +" Long: "+ long+ " Accuracy: "+ accuracy)

    currentLocation = turf.point([long, lat])
    for (let i = 0; i < bufs.features.length; i++){
        if(turf.booleanPointInPolygon(currentLocation, bufs.features[i])){
            
            currentIndex = i

            if (currentIndex != previousIndex){
                for (let j = 0; j < data_gjson.features.length; j++){
                    if (turf.booleanPointInPolygon(data_gjson.features[j], bufs.features[i])){
                        // console.log(data_gjson.features[j].properties['informatio'])
                        textToSpeech(data_gjson.features[j].properties['informatio'])
                    }
                }
            }
            
            previousIndex = currentIndex
            console.log("your are inside")
        }
        
    }
}