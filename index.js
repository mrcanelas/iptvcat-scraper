const fs = require("fs-extra");
const axios = require("axios");
const mergeJSON = require("merge-json")
const { JSDOM } = require("jsdom");
const iptvCatDomain = "iptvcat.com";
const iptvCatURL = "https://" + iptvCatDomain;

exeScraper()

function getStreamID(value) {
  const Id = value.replace("border-solid belongs_to_", "");
  return Id;
}

async function getRedirect(value) {
  const redirect = await axios.get(value).then(function (resp) {
    return resp.data.split("\n").filter((a) => a.includes("iptvcat"))[0];
  });
  return redirect;
}

async function getScrapping(url) {
  console.log("Visited: " + url);
  const resp = await axios.get(url);
  const dom = new JSDOM(resp.data);

  const nextPage =
    dom.window.document.querySelector('a[rel="next"]') !== null
      ? iptvCatURL +
        dom.window.document.querySelector('a[rel="next"]').getAttribute("href")
      : null;

  const pageNumber = url.split("/")[4] !== undefined ? url.split("/")[4] : 1;

  const ID = [],
    tempLink = [],
    Link = [],
    Channel = [],
    Country = [],
    Liveliness = [],
    Status = [],
    Format = [],
    Mbps = [],
    LastChecked = [];

  dom.window.document
    .querySelectorAll("tbody.streams_table > tr.border-solid")
    .forEach((item) => {
      if (item.getAttribute("class").includes("belongs_to_")) {
        ID.push({ ID: getStreamID(item.getAttribute("class")) });
      }
    });
  dom.window.document
    .querySelectorAll("td > table > tbody > tr > td:nth-child(2) > span")
    .forEach((item) => {
      tempLink.push({ Link: item.getAttribute("data-clipboard-text") });
    });
  dom.window.document.querySelectorAll("td.flag > a > img").forEach((item) => {
    Country.push({ Country: item.getAttribute("title") });
  });
  dom.window.document
    .querySelectorAll("td > span.channel_name")
    .forEach((item) => {
      Channel.push({ Channel: item.textContent });
    });
  dom.window.document
    .querySelectorAll("td > div.live > div.live")
    .forEach((item) => {
      Liveliness.push({ Liveliness: item.textContent });
    });
  dom.window.document.querySelectorAll("td > div.state").forEach((item) => {
    Status.push({ Status: item.getAttribute("title") });
  });
  dom.window.document
    .querySelectorAll("td.channel_checked > span")
    .forEach((item) => {
      LastChecked.push({ LastChecked: item.textContent });
    });
  dom.window.document.querySelectorAll("td:nth-child(6)").forEach((item) => {
    Format.push({ Format: item.textContent });
  });
  dom.window.document
    .querySelectorAll("td:nth-child(7) > span")
    .forEach((item) => {
      Mbps.push({ Mbps: item.textContent });
    });

  const redirect = await Promise.all(
    tempLink.map(async (obj) => {
      const redir = await getRedirect(obj.Link);
      Link.push({ Link: redir });
    })
  );

  const channels = ID.map((item, i) => {
    const obj = Object.assign(
      {},
      item,
      Channel[i],
      Link[i],
      Country[i],
      Liveliness[i],
      Status[i],
      Format[i],
      Mbps[i],
      LastChecked[i]
    );
    return obj;
  });
  if (pageNumber == 1) {
    fs.outputJson(`./data/${channels[0].Country}.json`, channels, (err) => {
      if (err) return console.log(err);
    });
    if (nextPage !== null) {
      console.log("Finished:" + url);
      getScrapping(nextPage)
    }
  } else {
    fs.readJson(`./data/${channels[0].Country}.json`, (err, packageObj) => {
      if (err) console.error(err);
      const result = mergeJSON.merge(packageObj, channels) ;
      fs.outputJson(`./data/${channels[0].Country}.json`, result, (err) => {
        if (err) return console.log(err);
        if (nextPage !== null) {
          console.log("Finished:" + url);
          getScrapping(nextPage)
        }
      });
    });
  }
}

async function exeScraper() {
  const countries = []
  const resp = await axios.get(iptvCatURL)
  const dom = new JSDOM(resp.data)
  const items = dom.window.document.querySelectorAll('a.regions.country')
  items.forEach(item => {
    const url = item.href
    countries.push(url)
  })
  for(let i = 0; countries[i] !== undefined; i++) {
    const scrapper = await Promise.all([getScrapping(countries[i])])
  }
}
