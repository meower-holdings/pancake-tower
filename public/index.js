const sleep = ms => new Promise(r => setTimeout(r, ms));
let userCountCount = {}

window.addEventListener("DOMContentLoaded", async function() {
    services = await (await fetch("/services")).json()
    document.querySelector("#services").innerHTML = ""
    services.forEach(service => renderService(service))
})

function renderService(service) {
    document.querySelector("#services").innerHTML += `
    <a href="${service.url}" target="_blank" class="servicelink" id="${service.name}" onclick="onclickService(this)" onauxclick="onclickService(this)"><div class="service">
        <img src="${`https://www.google.com/s2/favicons?domain=${new URL(service.url).host}&sz=16`}">
        <b>${service.display}</b> <span class="userpreview"></span>
        
        <span class="update">
            ${service.disabled ? '<img src="/resources/disabled.gif">' : localStorage.getItem(service.name) ? '<img src="/resources/throb.gif">' : 'never visited <img src="/resources/newservice.gif">'}
        </span><div id="${service.name}_marquee" class="goofymarquee"></div>
    </div></a>
    `

    if(!service.disabled && localStorage.getItem(service.name)) updateService(service.name, service.useUsercount);
}

function onclickService(service) {
    localStorage.setItem(service.id, (new Date()).getTime());
    service.querySelector('.update').innerHTML = '';
}

async function updateService(service, useUsercount = false) {
    const serviceData = await (await fetch(`/services/${service}?timestamp=${localStorage.getItem(service)}`)).json()
    let userCounts;

    if(useUsercount) userCounts = await (await fetch(`/services/${service}/usercount?timestamp=${localStorage.getItem(service)}`)).json()

    if(serviceData.count === 0) {
        document.querySelector(`#${service} .update`).classList.add("fade")
    } else {
        document.querySelector(`#${service} .update`).innerHTML = `${serviceData.count} <img src="/resources/newcontent.gif">`;

        if(serviceData.snippet) {
            document.querySelector(`#${service}_marquee`).innerHTML = serviceData.snippet

            marqueeInit({
                uniqueid: `${service}_marquee`,
                style: {
                    width: '100%',
                    color: 'gray'
                }
            })
        }
        if(useUsercount) {
            displayUsercount(service, userCounts)
            setInterval(displayUsercount, 2000, service, userCounts)
        }
    }
}

async function displayUsercount(service, userCounts) {
    if(!userCountCount[service]) userCountCount[service] = 0;
    if(userCountCount[service] > Object.values(userCounts).length) userCountCount[service] = 0
    document.querySelector(`#${service} .userpreview`).innerText = `${Object.values(userCounts)[userCountCount[service]]} new by ${Object.keys(userCounts)[userCountCount[service]]}`
    userCountCount[service] += 1;
}