/**
 * RE-OPTIMIZED FEEDS LOADER
 */
(function() {
  // 1. INJECT GLOBAL CSS (Mencegah Re-paint berulang)
  const style = document.createElement('style');
  style.textContent = `
    @keyframes skeleton-loading { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
    .skel-base { background: linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%); background-size: 200% 100%; animation: skeleton-loading 1.5s infinite; border-radius: 4px; }
    .jl_fe_title a { color: inherit; text-decoration: none; transition: 0.2s; }
    .jl_fe_title a:hover { opacity: 0.7; }
  `;
  document.head.appendChild(style);

  const CACHE_DURATION = 5 * 60 * 1000;
  const LAZY_LOAD_THRESHOLD = '400px'; // Lebih luas agar lebih responsif

  // 2. SKELETON RENDERER (Clean & Fast)
  function renderSkeleton() {
    const count = window.innerWidth >= 768 ? 4 : 2;
    const item = `
      <li style="display:flex;gap:12px;margin-bottom:15px;align-items:center;">
        <div class="skel-base" style="width:70px;height:50px;flex-shrink:0;"></div>
        <div style="flex:1;">
          <div class="skel-base" style="height:14px;width:85%;margin-bottom:8px;"></div>
          <div class="skel-base" style="height:10px;width:40%;"></div>
        </div>
      </li>`;
    return `<ul style="list-style:none;padding:0;margin:0;">${item.repeat(count)}</ul>`;
  }

  // 3. LIST RENDERER
  function renderList(items) {
    if (!items || !items.length) return '<p>Tidak ada konten.</p>';
    return '<ul style="list-style:none;padding:0;margin:0;">' +
      items.map(item => `
        <li style="display:flex;gap:12px;margin-bottom:15px;align-items:center;">
          <a href="${item.link}" class="post-img" style="flex-shrink:0;">
            <img src="${item.img}" 
                 loading="lazy" decoding="async"
                 style="width:70px;height:50px;object-fit:cover;border-radius:4px;"
                 onerror="this.src='https://placehold.co/70x50'"/>
          </a>
          <div style="flex:1;">
            <h2 class="h3 jl_fe_title jl_txt_2row" style="margin:0;font-size:16px;line-height:1.4;">
              <a href="${item.link}" target="_blank">${item.title}</a>
            </h2>
            <small style="font-size:11px;color:#888;">${item.date} • ${item.source.split('.')[0]}</small>
          </div>
        </li>`).join('') + '</ul>';
  }

  // 4. CACHE ENGINE
  const Cache = {
    get(key) {
      try {
        const data = JSON.parse(localStorage.getItem(key));
        return (data && (Date.now() - data.timestamp < CACHE_DURATION)) ? data.value : null;
      } catch { return null; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify({ value, timestamp: Date.now() })); } catch(e) {}
    }
  };

  // 5. OPTIMIZED FETCHERS
  async function fetchWP(source, catId, count) {
    const cacheKey = `wp_${source}_${catId || 'all'}_${count}`;
    const cached = Cache.get(cacheKey);
    if (cached) return cached;

    // Menggunakan _embed untuk menarik thumbnail sekaligus (Mencegah Waterfall)
    let url = `https://${source}/wp-json/wp/v2/posts?per_page=${count}&_fields=title.rendered,link,date,featured_media,_links,_embedded&_embed=wp:featuredmedia`;
    if (catId) url += `&categories=${catId}`;

    try {
      const res = await fetch(url, { cache: 'force-cache' });
      const posts = await res.json();
      
      const mapped = posts.map(post => {
        // Ambil thumbnail dari hasil _embed
        const img = post._embedded?.['wp:featuredmedia']?.[0]?.media_details?.sizes?.thumbnail?.source_url 
                 || post._embedded?.['wp:featuredmedia']?.[0]?.source_url 
                 || 'https://placehold.co/70x50';
        
        return {
          title: post.title.rendered,
          link: post.link,
          rawDate: post.date,
          date: new Date(post.date).toLocaleDateString('id-ID'),
          source: source,
          img: img
        };
      });

      Cache.set(cacheKey, mapped);
      return mapped;
    } catch (err) { return []; }
  }

  function fetchBlogger(source, category, count, callback) {
    const cacheKey = `blg_${source}_${category || 'all'}_${count}`;
    const cached = Cache.get(cacheKey);
    if (cached) return callback(cached);

    const cbName = 'blg_' + Math.random().toString(36).slice(2, 7);
    window[cbName] = function(data) {
      const entries = data.feed.entry || [];
      const mapped = entries.map(entry => ({
        title: entry.title.$t,
        link: entry.link.find(l => l.rel === 'alternate').href,
        rawDate: entry.published.$t,
        date: new Date(entry.published.$t).toLocaleDateString('id-ID'),
        source: source,
        img: entry.media$thumbnail ? entry.media$thumbnail.url.replace(/\/s\d+-c\//, '/s150-c/') : 'https://placehold.co/70x50'
      }));
      Cache.set(cacheKey, mapped);
      callback(mapped);
      delete window[cbName];
    };

    const script = document.createElement('script');
    const label = category ? `/-/${encodeURIComponent(category)}/` : '/';
    script.src = `https://${source}/feeds/posts/default${label}?alt=json&max-results=${count}&callback=${cbName}`;
    document.head.appendChild(script);
  }

  // 6. OBSERVER LOGIC
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const type = el.dataset.type;
        el.innerHTML = renderSkeleton();

        if (type === 'wp-multi') loadMultiWP(el);
        else if (type === 'blg-multi') loadMultiBlg(el);
        
        observer.unobserve(el);
      }
    });
  }, { rootMargin: LAZY_LOAD_THRESHOLD });

  // 7. MULTI-SOURCE HANDLERS
  async function loadMultiWP(container) {
    const sources = container.dataset.sources.split(',').map(s => s.trim());
    const count = parseInt(container.dataset.items) || 5;
    
    const results = await Promise.allSettled(sources.map(s => fetchWP(s, null, count)));
    let all = results.filter(r => r.status === 'fulfilled').flatMap(r => r.value);
    
    all.sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate));
    container.innerHTML = renderList(all.slice(0, count));
  }

  function loadMultiBlg(container) {
    const sources = container.dataset.sources.split(',').map(s => s.trim());
    const count = parseInt(container.dataset.items) || 5;
    let all = [], done = 0;

    sources.forEach(s => {
      fetchBlogger(s, null, count, (data) => {
        all = [...all, ...data];
        if (++done === sources.length) {
          all.sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate));
          container.innerHTML = renderList(all.slice(0, count));
        }
      });
    });
  }

  // INIT
  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll('.recent-wp-multi, .recent-blg-multi').forEach(el => {
      el.dataset.type = el.classList.contains('recent-wp-multi') ? 'wp-multi' : 'blg-multi';
      observer.observe(el);
    });
  });

})();

/* Scroll Control (Passive for Performance) */
(function() {
  let lastS = 0;
  window.addEventListener('scroll', () => {
    let currS = window.pageYOffset;
    if (Math.abs(currS - lastS) < 50) return;
    document.body.classList.toggle('dw', currS > lastS && currS > 100);
    document.body.classList.toggle('up', currS < lastS);
    lastS = currS;
  }, { passive: true });
})();
