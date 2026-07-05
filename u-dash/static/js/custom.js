// Add your custom JS here
document.addEventListener('DOMContentLoaded', function() {
    console.log('U-Dash Dashboard loaded!');
    
    // Quick Launch Search
    document.getElementById('quick-launch-search').addEventListener('input', function(event) {
        const searchTerm = event.target.value.toLowerCase();
        const items = document.querySelectorAll('#quick-launch-bar .col-6');
        
        items.forEach(item => {
            const itemName = item.querySelector('.btn').textContent.toLowerCase();
            if (itemName.includes(searchTerm)) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    });

    // Load links dynamically
    fetch('/api/links')
        .then(response => response.json())
        .then(data => {
            const linksContainer = document.getElementById('quick-launch-bar');
            linksContainer.innerHTML = '';
            data.forEach(item => {
                const colDiv = document.createElement('div');
                colDiv.className = 'col-6 col-md-4 col-lg-3 mb-3';
                
                const linkButton = document.createElement('a');
                linkButton.href = item.url;
                linkButton.className = 'btn btn-light w-100 d-flex align-items-center justify-content-start';
                
                const iconSpan = document.createElement('i');
                iconSpan.className = `${item.icon} me-2`;
                
                const textNode = document.createTextNode(item.name);
                
                linkButton.appendChild(iconSpan);
                linkButton.appendChild(textNode);
                
                colDiv.appendChild(linkButton);
                linksContainer.appendChild(colDiv);
            });
        });

    // Load widgets dynamically
    fetch('/api/widgets/weather')
        .then(response => response.json())
        .then(data => {
            const weatherWidget = document.querySelector('#widgets .card-header:contains("Weather")').closest('.card');
            const iframe = document.createElement('iframe');
            iframe.src = `https://www.weatherbit.io/widget/forecast/weather-map/YOUR_API_KEY?city=${data[0].city}`;
            iframe.width = "100%";
            iframe.height = "400";
            iframe.frameBorder = "0";
            
            weatherWidget.querySelector('.card-body').innerHTML = '';
            weatherWidget.querySelector('.card-body').appendChild(iframe);
        });

    fetch('/api/widgets/calendar')
        .then(response => response.json())
        .then(data => {
            const calendarWidget = document.querySelector('#widgets .card-header:contains("Calendar")').closest('.card');
            const iframe = document.createElement('iframe');
            iframe.src = data[0].calendar_url;
            iframe.width = "100%";
            iframe.height = "400";
            iframe.frameBorder = "0";
            
            calendarWidget.querySelector('.card-body').innerHTML = '';
            calendarWidget.querySelector('.card-body').appendChild(iframe);
        });
});