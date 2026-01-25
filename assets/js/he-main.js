document.addEventListener("DOMContentLoaded", () => { 

  const authorLabels = document.querySelectorAll('.byline.post-author .post-author-label');
  
  if (authorLabels.length > 0) {
    authorLabels.forEach(element => {
      element.innerHTML = element.innerHTML.replace(
        /HarianExpress\.com/g,
        '<a href="https://www.harianexpress.com" rel="noopener noreferrer">HarianExpress.com</a>'
      );
    });
  }
  
  setTimeout(() => { 
    function yzRecHL(e, element) { 
      const s = element.getAttribute("data-items"), label = element.getAttribute("data-label"); 
      let i = '<div class="cont flex wrap">'; 
      if (e.feed && e.feed.entry && e.feed.entry.length > 0) { 
        e.feed.entry.forEach((e, t) => { 
          if (t >= s) return; 
          const l = e.title.$t; 
          
          let a = e.media$thumbnail ? e.media$thumbnail.url : null;
          
          if (!a) {
            const contentText = e.content?.$t || e.summary?.$t || "";
            const imgMatch = contentText.match(/<img.*?src="(.*?)"/);
            if (imgMatch && imgMatch[1]) {
              a = imgMatch[1];
            }
          }
          
          if (!a) {
            a = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200'%3E%3Crect fill='%23ddd' width='300' height='200'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999' font-family='Arial'%3ENo Image%3C/text%3E%3C/svg%3E";
          }
          
          a = updateImageUrls(a); 
          const n = e.link.find((e) => "alternate" === e.rel).href, r = e.published.$t, c = e.category ? e.category[0].term : ""; 
          i += '<article class="items post relative w-fill">'; 
          i += '<div class="post-img relative">'; 
          i += `<a href="${n}"><img src="${a}" class="img-thumb br-05"/></a>`; 
          i += "</div>"; 
          i += '<div class="info flex column w-fill">'; 
          i += '<div class="titlendesc flex column">'; 
          i += `<span class="post-title max-line-3 relative"><a href="${n}">${l}</a></span>`; 
          i += "</div>"; 
          i += '<div class="meta relative g-05 mt-05 fs-09 flex wrap w-fill ai-c">'; 
          if (c) { 
            i += `<div class="post-labels"><a href="/search/label/${c}?&max-results=${s}">${c}</a></div>`; 
          } 
          i += `<time class="publish-date timeago fs-08" title="${r}"></time>`; 
          i += '<span class="yz-share pointer absolute zindex-1" title="share" onclick="shareM(this.closest(\'.items\'))">'; 
          i += '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24">'; 
          i += '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="m20 12l-6.4-7v3.5C10.4 8.5 4 10.6 4 19c0-1.167 1.92-3.5 9.6-3.5V19z"/>'; 
          i += "</svg></span>"; 
          i += "</div>"; 
          i += "</div>"; 
          i += "</article>"; 
        }); 
      } else { 
        i = '<div class="cont flex wrap"></div>'; 
      } 
      i += "</div>"; 
      element.innerHTML = i; 
      initSwipe(); 
      updateTimeAgo(); 
    } 
    (function () { 
      document.querySelectorAll(".recHL").forEach((recHL, index) => { 
        const items = recHL.getAttribute("data-items"), label = recHL.getAttribute("data-label"), dataSource = recHL.getAttribute("data-source"); 
        if (!dataSource) { 
          return; 
        } 
        const cbName = `yzRecHL_${index}`; 
        const blogUrl = dataSource.startsWith("http") ? dataSource : `https://${dataSource}`; 
        const loadFeed = (url, callbackName) => { 
          window[callbackName] = function (data) { 
            yzRecHL(data, recHL); 
          }; 
          const t = document.createElement("script"); 
          t.src = url; 
          t.onerror = () => { 
            if (label) { 
              const recentUrl = `${blogUrl.replace(/\/$/, "")}/feeds/posts/default?orderby=published&alt=json-in-script&max-results=${items}&callback=${callbackName}`; 
              loadFeed(recentUrl, callbackName); 
            } else { 
              yzRecHL({ feed: { entry: [] } }, recHL); 
            } 
          }; 
          document.body.appendChild(t); 
        }; 
        let scriptUrl = `${blogUrl.replace(/\/$/, "")}/feeds/posts/default${ label ? `/-/${encodeURIComponent(label)}` : "" }?orderby=published&alt=json-in-script&max-results=${items}&callback=${cbName}`; 
        loadFeed(scriptUrl, cbName); 
      }); 
    })(); 
  }, 1000); 
});

// Hanya aktif di mobile
if (window.innerWidth <= 768) {

  document.addEventListener('DOMContentLoaded', function() {
    function cleanUrl(url) {
      return url
        .replace(/[?&]m=1/gi, '');
    }
  
    // Cari semua link share di dalam #share
    var shareLinks = document.querySelectorAll('#share a');
  
    shareLinks.forEach(function(link) {
      var originalHref = link.getAttribute('href');
      if (originalHref) {
        var cleanedHref = cleanUrl(originalHref);
        link.setAttribute('href', cleanedHref);
      }
    });
  });

}
