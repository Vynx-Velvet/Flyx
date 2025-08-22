(function () {
  const _0x3f3f0f = function () {
    let _0x420c5d = true;
    return function (_0x5a2590, _0x5a0db9) {
      const _0x49b04e = _0x420c5d ? function () {
        if (_0x5a0db9) {
          const _0x3b9e9e = _0x5a0db9.apply(_0x5a2590, arguments);
          _0x5a0db9 = null;
          return _0x3b9e9e;
        }
      } : function () {};
      _0x420c5d = false;
      return _0x49b04e;
    };
  }();
  const _0x1ea49a = _0x3f3f0f(this, function () {
    return _0x1ea49a.toString().search("(((.+)+)+)+$").toString().constructor(_0x1ea49a).search("(((.+)+)+)+$");
  });
  _0x1ea49a();
  const _0x5c98a6 = function () {
    let _0x3a172e = true;
    return function (_0x25873b, _0x4a58d7) {
      const _0x442828 = _0x3a172e ? function () {
        if (_0x4a58d7) {
          const _0x185a49 = _0x4a58d7.apply(_0x25873b, arguments);
          _0x4a58d7 = null;
          return _0x185a49;
        }
      } : function () {};
      _0x3a172e = false;
      return _0x442828;
    };
  }();
  (function () {
    _0x5c98a6(this, function () {
      const _0x41f569 = new RegExp("function *\\( *\\)");
      const _0x1bfef3 = new RegExp("\\+\\+ *(?:[a-zA-Z_$][0-9a-zA-Z_$]*)", 'i');
      const _0xfb896c = _0x32e30e("init");
      if (!_0x41f569.test(_0xfb896c + 'chain') || !_0x1bfef3.test(_0xfb896c + 'input')) {
        _0xfb896c('0');
      } else {
        _0x32e30e();
      }
    })();
  })();
  const _0x19d68b = function () {
    let _0x2e627c = true;
    return function (_0x4cd028, _0x592b98) {
      const _0x1997c7 = _0x2e627c ? function () {
        if (_0x592b98) {
          const _0x259736 = _0x592b98.apply(_0x4cd028, arguments);
          _0x592b98 = null;
          return _0x259736;
        }
      } : function () {};
      _0x2e627c = false;
      return _0x1997c7;
    };
  }();
  const _0x5f5223 = _0x19d68b(this, function () {
    const _0x272930 = function () {
      let _0xcb7e41;
      try {
        _0xcb7e41 = Function("return (function() {}.constructor(\"return this\")( ));")();
      } catch (_0x1a2e1a) {
        _0xcb7e41 = window;
      }
      return _0xcb7e41;
    };
    const _0x18e9d3 = _0x272930();
    const _0x3d0400 = _0x18e9d3.console = _0x18e9d3.console || {};
    const _0x6d545a = ["log", 'warn', "info", "error", "exception", "table", "trace"];
    for (let _0xd28139 = 0; _0xd28139 < _0x6d545a.length; _0xd28139++) {
      const _0x4bf4d9 = _0x19d68b.constructor.prototype.bind(_0x19d68b);
      const _0x405b73 = _0x6d545a[_0xd28139];
      const _0x4db7fd = _0x3d0400[_0x405b73] || _0x4bf4d9;
      _0x4bf4d9.__proto__ = _0x19d68b.bind(_0x19d68b);
      _0x4bf4d9.toString = _0x4db7fd.toString.bind(_0x4db7fd);
      _0x3d0400[_0x405b73] = _0x4bf4d9;
    }
  });
  _0x5f5223();
  $(document).ready(function () {
    var _0x4e2cb1 = null;
    var _0x263213 = null;
    var _0x3d218b = null;
    var _0x4e3e03 = false;
    _0x5f4ff9();
    $("#btn-play").on("click", _0x58495a);
    $("#episode-btn").on('click', _0x2741f6);
    $("#close-ep-btn").on('click', _0x385f86);
    $(".season-items a").on('click', _0x461f51);
    $(".episodes li a").on('click', _0x4951de);
    $(document).on("click", "#skip-intro", function () {
      _0x2fdaa6();
    });
    $(document).on('click', "#skip-outro", function () {
      _0x3f670e();
    });
    var _0x597552 = null;
    var _0x32a33a = null;
    if (autoPlay) {
      _0x58495a()['finally']();
    }
    function _0x330ed7(_0x509d51) {
      if (_0x509d51.includes("#EXTM3U")) {
        return _0x509d51;
      }
      return _0x4707ee(atob(_0x509d51), "DFKykVC3c1");
    }
    function _0x4707ee(_0xeae381, _0x3cdcd7) {
      const _0x8a6b1e = [];
      let _0xde4b17 = 0;
      let _0x524b41;
      let _0xb2dd31 = '';
      let _0x831fb2;
      for (_0x831fb2 = 0; _0x831fb2 < 256; _0x831fb2++) {
        _0x8a6b1e[_0x831fb2] = _0x831fb2;
      }
      for (_0x831fb2 = 0; _0x831fb2 < 256; _0x831fb2++) {
        _0xde4b17 = (_0xde4b17 + _0x8a6b1e[_0x831fb2] + _0x3cdcd7.charCodeAt(_0x831fb2 % _0x3cdcd7.length)) % 256;
        _0x524b41 = _0x8a6b1e[_0x831fb2];
        _0x8a6b1e[_0x831fb2] = _0x8a6b1e[_0xde4b17];
        _0x8a6b1e[_0xde4b17] = _0x524b41;
      }
      _0x831fb2 = 0;
      _0xde4b17 = 0;
      for (let _0x76fe4c = 0; _0x76fe4c < _0xeae381.length; _0x76fe4c++) {
        _0x831fb2 = (_0x831fb2 + 1) % 256;
        _0xde4b17 = (_0xde4b17 + _0x8a6b1e[_0x831fb2]) % 256;
        _0x524b41 = _0x8a6b1e[_0x831fb2];
        _0x8a6b1e[_0x831fb2] = _0x8a6b1e[_0xde4b17];
        _0x8a6b1e[_0xde4b17] = _0x524b41;
        _0xb2dd31 += String.fromCharCode(_0xeae381.charCodeAt(_0x76fe4c) ^ _0x8a6b1e[(_0x8a6b1e[_0x831fb2] + _0x8a6b1e[_0xde4b17]) % 256]);
      }
      return _0xb2dd31;
    }
    async function _0x58495a() {
      _0xb5431d();
      await _0x217cf1();
      try {
        const _0x1a874b = $(".episodes li a");
        for (let _0x23298a = 0; _0x23298a < _0x1a874b.length; _0x23298a++) {
          const _0x27269c = $(_0x1a874b[_0x23298a]).attr("class");
          if (!_0x27269c || !_0x27269c.includes("active")) {
            continue;
          }
          const _0x386669 = $(_0x1a874b[_0x23298a]).attr("data-id");
          _0x37e418(_0x386669).then(() => _0x58ebad());
          break;
        }
      } catch (_0x1ac08f) {
        window.gtag("event", "play_failed");
      }
    }
    async function _0x37e418(_0x1d29db) {
      $("#servers").css("opacity", '1');
      $("#servers").css("visibility", "inherit");
      $(".dropdown-menu.servers").children(".dropdown-item").remove();
      if (!_0x4e2cb1 || !_0x4e2cb1.trim()) {
        _0x22fd91();
        window.gtag("event", "vrf_invalid");
        return Promise.reject();
      }
      const _0x25160c = _0x1f3188();
      const _0x35ce08 = _0x5e7990();
      let _0x1d17a0 = "?id=" + movieId + "&type=" + movieType + "&v=" + v + "&vrf=" + _0x4e2cb1 + "&imdbId=" + imdbId;
      if (_0x25160c && _0x35ce08 && movieType !== "movie") {
        _0x1d17a0 += "&season=" + _0x25160c + "&episode=" + _0x35ce08;
      }
      const _0x3f1bdf = await _0xea8af7("https://vidsrc.cc/api/" + movieId + "/servers" + _0x1d17a0);
      if (!_0x3f1bdf || !_0x3f1bdf.data) {
        window.gtag("event", "server_failed");
        const _0xc8b8b4 = {
          "Content-Type": "application/json"
        };
        const _0x5c8dd6 = {
          name: "server_error",
          message: '' + _0x3f1bdf.message,
          url: "https://vidsrc.cc/api/" + movieId + "/servers" + _0x1d17a0
        };
        const _0x15a7c4 = {
          'method': "POST",
          'headers': _0xc8b8b4,
          'body': JSON.stringify(_0x5c8dd6)
        };
        _0x3a0d97("https://vidsrc.cc/track", _0x15a7c4)["finally"]();
        _0x22fd91();
        return Promise.reject();
      }
      _0x263213 = '' + movieId + (_0x1d29db ? '-' + _0x1d29db : '');
      for (let _0x4b3288 = 0; _0x4b3288 < _0x3f1bdf.data.length; _0x4b3288++) {
        const _0x7b581e = _0x3f1bdf.data[_0x4b3288];
        const _0x1290ea = _0x4b3288 === 0 ? "dropdown-item active" : "dropdown-item";
        const _0xc2050b = "<a class=\"" + _0x1290ea + "\" href=\"javascript:;\" data-hash=" + _0x7b581e.hash + '>' + _0x7b581e.name + "</a>";
        $(".dropdown-menu.servers").append($(_0xc2050b).click(_0x3af348));
      }
      return Promise.resolve(_0x3f1bdf.data);
    }
    function _0x58ebad() {
      const _0x4573f5 = $(".servers a");
      for (let _0x3fee92 = 0; _0x3fee92 < _0x4573f5.length; _0x3fee92++) {
        const _0xe8d8ac = $(_0x4573f5[_0x3fee92]).attr("class");
        if (!_0xe8d8ac || !_0xe8d8ac.includes("active")) {
          continue;
        }
        _0x5249dc($(_0x4573f5[_0x3fee92]).attr("data-hash"), _0x3fee92)["finally"]();
        break;
      }
    }
    function _0x832e75(_0x19a389) {
      _0x4e3e03 = true;
      const _0x4d08f2 = $(".servers a");
      for (let _0x517317 = 0; _0x517317 < _0x4d08f2.length; _0x517317++) {
        const _0x26cd3d = _0x4d08f2[_0x517317];
        const _0x4ab2f9 = $(_0x26cd3d).attr("data-hash");
        if (_0x4ab2f9 !== _0x19a389) {
          continue;
        }
        if (_0x4ab2f9 === _0x19a389 && _0x517317 < _0x4d08f2.length - 1) {
          $(_0x4d08f2[_0x517317 + 1]).click();
        }
      }
    }
    function _0x3af348(_0x2834dc) {
      _0xb5431d();
      _0x4e3e03 = true;
      const _0x35326f = $(".servers a");
      const _0x463bf9 = $(_0x2834dc.currentTarget).attr("data-hash");
      for (let _0x1ca571 = 0; _0x1ca571 < _0x35326f.length; _0x1ca571++) {
        const _0x54cead = _0x35326f[_0x1ca571];
        const _0x1a0bd9 = $(_0x54cead).attr("data-hash");
        const _0x5a0092 = $(_0x54cead).attr("class");
        if (_0x463bf9 === _0x1a0bd9) {
          $(_0x54cead).addClass("active");
          $(".title").css("display", "block");
          _0x5249dc(_0x1a0bd9, _0x1ca571)["finally"]();
          continue;
        }
        if (_0x5a0092 && _0x5a0092.includes("active") && _0x1a0bd9 !== _0x463bf9) {
          $(_0x54cead).removeClass("active");
        }
      }
    }
    function _0x461f51(_0x5c73aa) {
      const _0x136b6f = $(_0x5c73aa.currentTarget).attr("data-number");
      $(".season-current")[0].innerText = _0x5c73aa.currentTarget.innerText;
      const _0x9b3db5 = $('.episodes');
      for (let _0x4135e0 = 0; _0x4135e0 < _0x9b3db5.length; _0x4135e0++) {
        const _0x38e8a1 = _0x9b3db5[_0x4135e0];
        const _0x28b9f1 = $(_0x38e8a1).attr("data-season");
        $(_0x38e8a1).css("display", _0x28b9f1 === _0x136b6f ? "block" : "none");
      }
    }
    async function _0x4951de(_0x4dee62) {
      _0xb5431d();
      await _0x217cf1();
      const {
        currentTarget: _0x1b965b
      } = _0x4dee62;
      _0x4e3e03 = true;
      _0xaf8d74($(_0x1b965b).attr("data-id"));
      _0x37e418($(_0x1b965b).attr("data-id")).then(() => {
        _0x58ebad();
        _0x385f86();
      });
    }
    function _0xaf8d74(_0x1ab149) {
      const _0x580994 = $(".episodes li a");
      for (let _0x1100ad = 0; _0x1100ad < _0x580994.length; _0x1100ad++) {
        const _0x364c07 = _0x580994[_0x1100ad];
        const _0x564c94 = $(_0x364c07).attr("data-id");
        const _0x30abfb = $(_0x364c07).attr("class");
        if (_0x564c94 === _0x1ab149) {
          $(_0x364c07).addClass("active");
          continue;
        }
        if (_0x30abfb && _0x30abfb.includes("active") && _0x564c94 !== _0x1ab149) {
          $(_0x364c07).removeClass("active");
        }
      }
    }
    function _0x5f4ff9() {
      const _0x47ad76 = $('.episodes');
      _0x47ad76.first().css("display", "block");
      const _0x5537c7 = $(_0x47ad76.first()).find('a');
      if (!_0x5537c7 || !_0x5537c7.length) {
        return;
      }
      _0x5537c7.first().addClass("active");
    }
    async function _0x217cf1() {
      if (_0x4e2cb1) {
        return Promise.resolve();
      }
      try {
        var _0x35307a = ["encrypt"];
        async function _0x1c9564(_0x31b522, _0x344f62) {
          const _0x44eede = new TextEncoder();
          const _0xe7e539 = _0x44eede.encode(_0x31b522);
          const _0x5daf1d = await crypto.subtle.digest('SHA-256', _0x44eede.encode(_0x344f62));
          const _0x43a9a8 = {
            name: "AES-CBC"
          };
          const _0x186ca3 = await crypto.subtle.importKey("raw", _0x5daf1d, _0x43a9a8, false, _0x35307a);
          const _0x3fd2cb = new Uint8Array(16);
          const _0x342f5e = {
            name: "AES-CBC",
            iv: _0x3fd2cb
          };
          const _0x311ae1 = await crypto.subtle.encrypt(_0x342f5e, _0x186ca3, _0xe7e539);
          function _0x6e7d9a(_0x5e33cc) {
            const _0x3b1b56 = btoa(_0x5e33cc);
            return _0x3b1b56.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
          }
          return _0x6e7d9a(String.fromCharCode(...new Uint8Array(_0x311ae1)));
        }
        _0x4e2cb1 = await _0x1c9564(movieId, userId);
      } catch (_0x27a40d) {
        window.gtag("event", "wasm_failed");
      }
    }
    function _0xb5431d() {
      if ($("#b-loading").length) {
        return;
      }
      $("main").children().remove();
      $("main").append("<div id=\"b-loading\" class=\"b-loading\"><div></div><div></div></div>");
    }
    function _0x22fd91() {
      $("main").children().remove();
      $("main").append("<div id=\"wrapper\"><div class=\"not-found\"><p>Opps! 404</p><p>Page not found.</p></div></div>");
    }
    function _0x2741f6() {
      $('#ep-panel').addClass("active");
    }
    function _0x385f86() {
      $("#ep-panel").removeClass("active");
    }
    function _0x2fdaa6() {
      $("#skip-intro").hide();
      if (_0x3d218b) {
        _0x3d218b.seek(_0x597552.end);
      }
    }
    function _0x3f670e() {
      $("#skip-outro").hide();
      if (_0x3d218b) {
        _0x3d218b.seek(_0x32a33a.end);
      }
    }
    function _0x2bfce5(_0x5e25a4) {
      if (!_0x5e25a4 || !_0x5e25a4.data) {
        return true;
      }
      return !_0x5e25a4.data.source && !_0x5e25a4.data.sources;
    }
    async function _0x5249dc(_0x5ac8d8, _0x439857) {
      try {
        const _0x55077e = await _0xea8af7("https://vidsrc.cc/api/source/" + _0x5ac8d8);
        if (_0x55077e && _0x55077e.data && _0x55077e.data.type === 'iframe') {
          window.gtag('event', "used_iframe");
          window.gtag("event", "source_success");
          const _0x35de12 = $("<iframe>", {
            'title': '',
            'scrolling': 'no',
            'frameborder': 0x0,
            'marginWidth': 0x0,
            'allowfullscreen': 'yes',
            'src': _0x55077e.data.source,
            'id': 'b-player',
            'allow': "autoplay; fullscreen",
            'style': "width: 100%; height: 100%; overflow: hidden;",
            'referrerpolicy': "no-referrer-when-downgrade"
          });
          $("main").children().remove();
          $("main").append(_0x35de12);
          return;
        }
        if (_0x2bfce5(_0x55077e) && _0x439857 < 1 && !_0x4e3e03) {
          window.gtag("event", "source_failed");
          _0x832e75(_0x5ac8d8);
          return;
        }
        if (_0x2bfce5(_0x55077e)) {
          window.gtag("event", "source_empty");
          $("main").children().remove();
          $("main").append("<div class=\"msg\">Invalid source, please switch servers!</div>");
          return;
        }
        const {
          data: _0x1158d2
        } = _0x55077e;
        let _0x93b5d1 = _0x1158d2.thumbnails ? [{
          'kind': "thumbnails",
          'file': _0x1158d2.thumbnails
        }] : [];
        const _0x477557 = _0xedb7cf('sub.file');
        const _0x783776 = _0xedb7cf("sub.label");
        const _0x10ffdb = _0xedb7cf("autoSkipIntro") === "true";
        if (_0x477557 && _0x783776) {
          const _0x529ae2 = {
            file: _0x477557,
            label: _0x783776,
            "default": true
          };
          _0x1158d2.subtitles = [_0x529ae2];
        }
        const _0x3dbbb = _0xedb7cf('sub.info');
        if (_0x3dbbb) {
          _0x1158d2.subtitles = _0x3dbbb;
        }
        if (_0x1158d2.subtitles) {
          _0x93b5d1 = [..._0x93b5d1, ..._0x1158d2.subtitles.map(_0x4bcca2 => ({
            ..._0x4bcca2,
            'kind': "captions"
          }))];
        }
        const _0x10620e = _0x1158d2.source ? [{
          'file': _0x1158d2.source
        }] : _0x1158d2.sources || [];
        class _0x7d7b83 extends Hls.DefaultConfig.loader {
          constructor(_0x402505) {
            super(_0x402505 || {});
            const _0x28c5ce = this.load.bind(this);
            this.load = function (_0x45c9bf, _0x556f8e, _0x71f417) {
              if (/\.m3u8$/.test(_0x45c9bf.url.split('?')[0])) {
                const _0x285355 = _0x71f417.onSuccess;
                _0x71f417.onSuccess = function (_0x1385c0, _0x2e359c, _0x2f60cf, _0x30372c) {
                  _0x1385c0.data = _0x330ed7(_0x1385c0.data);
                  _0x285355(_0x1385c0, _0x2e359c, _0x2f60cf, _0x30372c);
                };
              }
              _0x28c5ce(_0x45c9bf, _0x556f8e, _0x71f417);
            };
          }
        }
        window.gtag("event", "source_success");
        const _0x573a90 = {
          tracks: _0x93b5d1,
          sources: _0x10620e
        };
        const _0x48f172 = {
          loader: _0x7d7b83
        };
        const _0x1d93f9 = {
          cast: {},
          autostart: true,
          displaydescription: true,
          displaytitle: true,
          height: "100%",
          hlshtml: true,
          key: "XSuP4qMl+9tK17QNb+4+th2Pm9AWgMO/cYH8CI0HGGr7bdjo",
          playbackRateControls: true,
          playbackRates: [0.5, 1, 1.25, 1.5, 2, 4],
          playlist: [_0x573a90],
          preload: "auto",
          primary: "html5",
          width: "100%",
          hlsjsConfig: _0x48f172
        };
        _0x597552 = _0x1158d2.intro;
        _0x32a33a = _0x1158d2.outro;
        $("main").children().remove();
        $("main").append("<div id=\"player\"></div>");
        _0x3d218b = jwplayer('player').setup(_0x1d93f9);
        _0x3d218b.addButton("https://vidsrc.cc/assets/players/skip-10-next.svg", "Seek forward 10s", function () {
          _0x3d218b.seek(_0x3d218b.getPosition() + 10);
        }, "seek-forward-10s");
        _0x3d218b.addButton("https://vidsrc.cc/assets/players/skip-10-prev.svg", "Seek backward 10s", function () {
          _0x3d218b.seek(_0x3d218b.getPosition() - 10);
        }, "seek-backward-10s");
        function _0x304050(_0x23e361) {
          if (_0x1158d2 && _0x1158d2.intro) {
            if (_0x23e361 >= _0x1158d2.intro.start && _0x23e361 < _0x1158d2.intro.end) {
              if (_0x10ffdb) {
                _0x2fdaa6();
              } else {
                $("#skip-intro").show();
              }
            } else {
              $("#skip-intro").hide();
            }
          }
          if (_0x1158d2 && _0x1158d2.outro) {
            if (_0x23e361 >= _0x1158d2.outro.start && _0x23e361 < _0x1158d2.outro.end) {
              if (_0x10ffdb) {
                _0x3f670e();
              } else {
                $("#skip-outro").show();
              }
            } else {
              $("#skip-outro").hide();
            }
          }
        }
        var _0x511303 = new Date().getTime();
        const _0x3db46d = localStorage.getItem(_0x263213 + ".position");
        _0x3d218b.on("firstFrame", function () {
          window.gtag("event", "play_success");
          let _0x1c8f27 = 0;
          let _0x3b8145 = 0;
          const _0x1b3fda = _0x3d218b.getDuration();
          if (_0x1158d2.intro && !$(".jw-intro").length) {
            _0x3b8145 = _0x1158d2.intro.start / _0x1b3fda * 100;
            _0x1c8f27 = (_0x1158d2.intro.end - _0x1158d2.intro.start) / _0x1b3fda * 100;
            $(".jw-slider-container").append("<div class=\"jw-reset jw-intro\" style=\"margin-left: " + _0x3b8145 + "%; width: " + _0x1c8f27 + "%\"></div>");
          }
          if (_0x1158d2.outro && !$('.jw-outro').length) {
            _0x1158d2.outro.end = _0x1158d2.outro.end > _0x1b3fda ? _0x1b3fda : _0x1158d2.outro.end;
            _0x1c8f27 = _0x1158d2.outro.start / _0x1b3fda * 100 - _0x1c8f27 - _0x3b8145;
            _0x3b8145 = (_0x1158d2.outro.end - _0x1158d2.outro.start) / _0x1b3fda * 100;
            $(".jw-slider-container").append("<div class=\"jw-reset jw-outro\" style=\"margin-left: " + _0x1c8f27 + "%; width: " + _0x3b8145 + "%\"></div>");
          }
        }).on("idle", function () {
          window.gtag('event', "play_stopped");
        }).on("ready", function () {
          window.gtag("event", 'play_ready');
          if (_0x1158d2.intro) {
            $("#player").prepend("<div class=\"bot-right\"><a style=\"display: none;\" href=\"javascript:;\" id=\"skip-intro\" class=\"zbtn zbtn-outline\">Skip Intro</a></div>");
          }
          if (_0x1158d2.outro) {
            $("#player").prepend("<div class=\"bot-right\"><a style=\"display: none;\" href=\"javascript:;\" id=\"skip-outro\" class=\"zbtn zbtn-outline\">Skip Outro</a></div>");
          }
        }).once("play", function () {
          if (_0x3db46d && _0x3db46d > 0) {
            _0x3d218b.seek(_0x3db46d);
          }
          _0xf5a79c({
            'data': {
              'event': "play",
              'duration': _0x3d218b.getDuration(),
              'currentTime': _0x3db46d ? Number(_0x3db46d) : 0
            }
          });
        }).on("fullscreen", function () {
          window.gtag("event", "play_fullscreen");
        }).on("time", function (_0x4da360) {
          _0x304050(_0x4da360.position);
          localStorage.setItem(_0x263213 + ".position", _0x4da360.position);
          if (_0x21d513) {
            return;
          }
          var _0x21d513 = setTimeout(() => {
            _0x21d513 = null;
            _0xf5a79c({
              'data': {
                'event': "time",
                'currentTime': _0x4da360.currentTime,
                'duration': _0x3d218b.getDuration()
              }
            });
            const _0x5544b6 = new Date().getTime();
            if (_0x511303 && _0x5544b6 - _0x511303 > 300000) {
              _0x511303 = null;
              window.gtag("event", "play_more_than_5m");
            }
          }, 7000);
        }).on("pause", function () {
          const _0x42f04f = localStorage.getItem(_0x263213 + ".position");
          _0xf5a79c({
            'data': {
              'event': 'pause',
              'duration': _0x3d218b.getDuration(),
              'currentTime': _0x42f04f ? Number(_0x42f04f) : 0
            }
          });
        }).on("complete", function () {
          window.gtag("event", "play_complete");
          localStorage.setItem(_0x263213 + ".position", '0');
          const _0x1e18d7 = localStorage.getItem(_0x263213 + '.position');
          _0xf5a79c({
            'data': {
              'event': "complete",
              'duration': _0x3d218b.getDuration(),
              'currentTime': _0x1e18d7 ? Number(_0x1e18d7) : 0
            }
          });
        }).on('error', function (_0x5da371) {
          window.gtag("event", "player_error");
          const _0x53821f = localStorage.getItem(_0x263213 + ".position");
          const _0x545bfe = {
            'method': 'POST',
            'headers': {
              'Content-Type': "application/json"
            },
            'body': JSON.stringify({
              'name': "player_error",
              'url': window.location.href,
              'message': _0x5da371.code + " - " + _0x5da371.message + " | time " + _0x53821f
            })
          };
          _0x3a0d97("https://vidsrc.cc/track", _0x545bfe)["finally"]();
          if (!_0x4e3e03) {
            _0x832e75(_0x5ac8d8);
          }
        }).on("setupError", function (_0x577fd2) {
          window.gtag("event", "setup_error");
          if (!_0x4e3e03) {
            _0x832e75(_0x5ac8d8);
          }
          const _0x17d3f6 = {
            'method': 'POST',
            'headers': {
              'Content-Type': "application/json"
            },
            'body': JSON.stringify({
              'name': "setup_error",
              'url': window.location.href,
              'message': _0x577fd2.code + " - " + _0x577fd2.message
            })
          };
          _0x3a0d97("https://vidsrc.cc/track", _0x17d3f6)["finally"]();
        }).on("adImpression", function (_0x65aaf) {
          window.gtag("event", "ad_impression");
        });
      } catch (_0x36eeec) {
        $("main").children().remove();
        window.gtag("event", "jw_player_error");
        $("main").append("<div class=\"msg\">Invalid source, please switch servers!!!</div>");
      }
    }
    function _0x5e7990() {
      let _0x3e3cf9 = null;
      try {
        const _0x123c24 = $(".episodes li a");
        for (let _0x4a94a8 = 0; _0x4a94a8 < _0x123c24.length; _0x4a94a8++) {
          const _0xfad09b = _0x123c24[_0x4a94a8];
          const _0x4aaae0 = $(_0xfad09b).attr("class");
          if (_0x4aaae0 && _0x4aaae0.includes('active')) {
            _0x3e3cf9 = $(_0xfad09b).attr("data-number");
          }
        }
        return _0x3e3cf9;
      } catch (_0x501c84) {
        return _0x3e3cf9;
      }
    }
    function _0x1f3188() {
      let _0x5a0b15 = null;
      try {
        const _0x358a4c = $('.episodes');
        for (let _0x558e15 = 0; _0x558e15 < _0x358a4c.length; _0x558e15++) {
          const _0x444edb = _0x358a4c[_0x558e15];
          const _0x2f8abf = $(_0x444edb).attr("style");
          const _0x5bc65a = /display:\s*block;/i;
          if (_0x5bc65a.test(_0x2f8abf)) {
            _0x5a0b15 = $(_0x444edb).attr("data-season");
            break;
          }
        }
        return _0x5a0b15;
      } catch (_0x27112f) {
        return _0x5a0b15;
      }
    }
    function _0x3a0d97(_0xd42a02, _0xe43cb5 = {}) {
      return fetch(_0xd42a02, _0xe43cb5).then(async _0x58eaaf => {
        if (_0x58eaaf.ok) {
          return _0x58eaaf.json();
        }
        const _0x4c7638 = await _0x58eaaf.text();
        throw new Error(_0x58eaaf.status + " " + _0x58eaaf.type + " " + _0x58eaaf.redirected + " " + _0x4c7638 + " url " + _0x58eaaf.url);
      }).then(_0x4460ae => _0x4460ae)['catch'](_0x275518 => _0x275518);
    }
    async function _0xea8af7(_0x1ca675) {
      const _0x1f1d06 = {
        maxRedirects: 0x0
      };
      try {
        return (await axios.get(_0x1ca675, _0x1f1d06)).data;
      } catch (_0x9a5af6) {
        if (_0x9a5af6.response) {
          return {
            'stack': _0x9a5af6.stack,
            'message': "first " + _0x9a5af6.response.status + " " + JSON.stringify(_0x9a5af6.response.data)
          };
        } else {
          if (_0x9a5af6.request) {
            const _0x4e328c = {
              stack: _0x9a5af6.stack,
              message: "second " + (_0x9a5af6.responseText || _0x9a5af6.message)
            };
            return _0x4e328c;
          }
        }
        const _0x56020e = {
          stack: _0x9a5af6.stack,
          message: "final " + _0x9a5af6.message
        };
        return _0x56020e;
      }
    }
    function _0xf5a79c(_0x11d7df) {
      try {
        _0x11d7df.data.tmdbId = movieId;
        _0x11d7df.data.mediaType = movieType;
        if (season) {
          _0x11d7df.data.season = season;
        }
        if (episode) {
          _0x11d7df.data.episode = episode;
        }
        const _0x484a1b = {
          data: _0x11d7df.data,
          type: "PLAYER_EVENT"
        };
        window.parent.postMessage(_0x484a1b, '*');
      } catch (_0xaccde) {
        console.error(_0xaccde.message);
      }
    }
    function _0xedb7cf(_0x289d7d) {
      try {
        const _0x1199b9 = window.location.href;
        _0x289d7d = _0x289d7d.replace(/[\\[\]]/g, "\\$&");
        const _0x2aa587 = new RegExp("[?&]" + _0x289d7d + "(=([^&#]*)|&|#|$)");
        const _0x2746d4 = _0x2aa587.exec(_0x1199b9);
        if (!_0x2746d4) {
          return null;
        }
        if (!_0x2746d4[2]) {
          return '';
        }
        return decodeURIComponent(_0x2746d4[2].replace(/\+/g, " "));
      } catch (_0x52678c) {
        return null;
      }
    }
  });
})();
(function () {
  const _0x2b6c04 = function () {
    let _0x4c9ebe;
    try {
      _0x4c9ebe = Function("return (function() {}.constructor(\"return this\")( ));")();
    } catch (_0x5e1edc) {
      _0x4c9ebe = window;
    }
    return _0x4c9ebe;
  };
  const _0x23e638 = _0x2b6c04();
  _0x23e638.setInterval(_0x32e30e, 500);
})();
function _0x32e30e(_0xdcb55c) {
  function _0x477a2d(_0x1d5287) {
    if (typeof _0x1d5287 === 'string') {
      return function (_0x317256) {}.constructor("while (true) {}").apply("counter");
    } else if (('' + _0x1d5287 / _0x1d5287).length !== 1 || _0x1d5287 % 20 === 0) {
      (function () {
        return true;
      }).constructor("debugger").call("action");
    } else {
      (function () {
        return false;
      }).constructor("debugger").apply("stateObject");
    }
    _0x477a2d(++_0x1d5287);
  }
  try {
    if (_0xdcb55c) {
      return _0x477a2d;
    } else {
      _0x477a2d(0);
    }
  } catch (_0x28e0fc) {}
}