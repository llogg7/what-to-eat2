const LS_KEY = "food_picker_data";

const LS = {
    save: function(d) {
        try { localStorage.setItem(LS_KEY, JSON.stringify(d)); } catch(e) {}
    },
    load: function() {
        try {
            var raw = localStorage.getItem(LS_KEY);
            if (raw) return JSON.parse(raw);
        } catch(e) {}
        return null;
    }
};

var App = {
    tab: "random",
    mode: "all",
    exclude: new Set(),
    busy: false,
    data: { locations: [], foods: [], history: [], favorites: [] },

    init: function() {
        var cached = LS.load();
        if (cached) {
            this.data = cached;
            this.renderLocList();
            this.renderFoodList();
            this.renderHistory();
            this.updateLocSelect();
        }
        this.bind();
        this.fetchFromServer();
    },

    saveToLS: function() {
        LS.save(this.data);
        this.syncToServer();
    },

    fetchFromServer: function() {
        var self = this;
        fetch('/api/data')
            .then(function(r) { return r.json(); })
            .then(function(serverData) {
                if (serverData.locations || serverData.foods) {
                    self.data = serverData;
                    self.saveToLS();
                    self.renderLocList();
                    self.renderFoodList();
                    self.renderHistory();
                    self.updateLocSelect();
                }
            })
            .catch(function() {});
    },

    syncToServer: function() {
        var self = this;
        fetch('/api/import', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(this.data)
        })
        .catch(function() {});
    },

    bind: function() {
        var self = this;
        document.querySelectorAll(".nav-btn").forEach(function(b) {
            b.addEventListener("click", function() { self.switchTab(b.dataset.tab); });
        });
        document.querySelectorAll(".mode-pill").forEach(function(b) {
            b.addEventListener("click", function() { self.switchMode(b.dataset.mode); });
        });
        document.getElementById("spin-btn").addEventListener("click", function() { self.spin(); });
        document.getElementById("spin-again").addEventListener("click", function() { self.spin(); });
        document.getElementById("add-location-form").addEventListener("submit", function(e) {
            e.preventDefault();
            self.addLoc();
        });
        document.getElementById("add-food-form").addEventListener("submit", function(e) {
            e.preventDefault();
            self.addFood();
        });
        document.getElementById("clear-exclude").addEventListener("click", function() {
            self.exclude.clear();
            self.renderExclude();
        });
        document.getElementById("export-data").addEventListener("click", function() { self.exportData(); });
        document.getElementById("import-data").addEventListener("click", function() {
            document.getElementById("import-file").click();
        });
        document.getElementById("import-file").addEventListener("change", function(e) { self.importData(e); });
        document.getElementById("clear-history").addEventListener("click", function() {
            if (!confirm("确定要清空历史记录吗？")) return;
            self.data.history = [];
            self.saveToLS();
            self.renderHistory();
        });
    },

    switchTab: function(tab) {
        this.tab = tab;
        document.querySelectorAll(".nav-btn").forEach(function(b) {
            b.classList.toggle("active", b.dataset.tab === tab);
        });
        document.querySelectorAll(".tab-content").forEach(function(c) {
            c.classList.toggle("active", c.id === "tab-" + tab);
        });
        if (tab === "manage") {
            this.updateLocSelect();
            this.renderLocList();
            this.renderFoodList();
        }
        if (tab === "history") this.renderHistory();
    },

    switchMode: function(mode) {
        this.mode = mode;
        this.exclude.clear();
        document.querySelectorAll(".mode-pill").forEach(function(b) {
            b.classList.toggle("active", b.dataset.mode === mode);
        });
        document.getElementById("panel-location").classList.toggle("hidden", mode !== "location");
        document.getElementById("panel-price").classList.toggle("hidden", mode !== "price");
        document.getElementById("panel-exclude").classList.toggle("hidden", mode !== "exclude");
        if (mode === "location") this.updateLocSelect();
        if (mode === "exclude") this.renderExclude();
    },

    addLoc: function() {
        var input = document.getElementById("location-name");
        var name = input.value.trim();
        if (!name) return;
        if (this.data.locations.includes(name)) {
            alert("该地点已存在");
            return;
        }
        this.data.locations.push(name);
        this.saveToLS();
        input.value = "";
        this.renderLocList();
        this.updateLocSelect();
        alert("添加成功: " + name);
    },

    delLoc: function(name) {
        if (!confirm("确定要删除地点 \"" + name + "\" 及其所有食物吗？")) return;
        this.data.locations = this.data.locations.filter(function(l) { return l !== name; });
        this.data.foods = this.data.foods.filter(function(f) { return f.location !== name; });
        this.saveToLS();
        this.renderLocList();
        this.renderFoodList();
        this.updateLocSelect();
    },

    addFood: function() {
        var loc = document.getElementById("food-location").value;
        var name = document.getElementById("food-name").value.trim();
        var price = parseFloat(document.getElementById("food-price").value);
        if (!loc) { alert("请选择地点"); return; }
        if (!name) { alert("请输入食物名称"); return; }
        var maxId = 0;
        for (var i = 0; i < this.data.foods.length; i++) {
            if (this.data.foods[i].id > maxId) maxId = this.data.foods[i].id;
        }
        this.data.foods.push({ id: maxId + 1, location: loc, name: name, price: price });
        this.saveToLS();
        document.getElementById("food-location").value = "";
        document.getElementById("food-name").value = "";
        document.getElementById("food-price").value = "";
        this.renderFoodList();
        alert("添加成功: " + name);
    },

    delFood: function(id) {
        if (!confirm("确定要删除吗？")) return;
        this.data.foods = this.data.foods.filter(function(f) { return f.id !== id; });
        this.saveToLS();
        this.renderFoodList();
    },

    renderLocList: function() {
        var list = document.getElementById("location-list");
        if (!this.data.locations.length) {
            list.innerHTML = ""; return;
        }
        var html = "";
        for (var i = 0; i < this.data.locations.length; i++) {
            var n = this.data.locations[i];
            var esc = n.replace(/'/g, "\\'");
            html += '<div class="list-item"><span class="item-name">' + n +
                '</span><button class="btn-delete" onclick="App.delLoc(\'' + esc + '\')">删除</button></div>';
        }
        list.innerHTML = html;
    },

    renderFoodList: function() {
        var list = document.getElementById("food-list");
        if (!this.data.foods.length) {
            list.innerHTML = ""; return;
        }
        var html = "";
        for (var i = 0; i < this.data.foods.length; i++) {
            var f = this.data.foods[i];
            html += '<div class="list-item"><div class="item-left">' +
                '<span class="item-name">' + f.name + '</span>' +
                '<span class="item-meta">' + f.location + ' ' + f.price + '元</span>' +
                '</div><button class="btn-delete" onclick="App.delFood(' + f.id + ')">删除</button></div>';
        }
        list.innerHTML = html;
    },

    updateLocSelect: function() {
        var locSel = document.getElementById("random-location");
        var foodLoc = document.getElementById("food-location");
        var html = "";
        for (var i = 0; i < this.data.locations.length; i++) {
            html += '<option value="' + this.data.locations[i] + '">' + this.data.locations[i] + '</option>';
        }
        locSel.innerHTML = '<option value="">-- 请选择地点 --</option>' + html;
        foodLoc.innerHTML = '<option value="">-- 请选择地点 --</option>' + html;
    },

    renderExclude: function() {
        var list = document.getElementById("exclude-list");
        if (!this.data.foods.length) {
            list.innerHTML = '<div class="empty">暂无食物数据</div>'; return;
        }
        var html = "";
        for (var i = 0; i < this.data.foods.length; i++) {
            var f = this.data.foods[i];
            var sel = this.exclude.has(f.id) ? " selected" : "";
            html += '<div class="exclude-item' + sel + '" data-id="' + f.id + '">' + f.name + '</div>';
        }
        list.innerHTML = html;
        var items = list.querySelectorAll(".exclude-item");
        for (var i = 0; i < items.length; i++) {
            (function(el) {
                el.addEventListener("click", function() {
                    var id = parseInt(el.dataset.id);
                    if (App.exclude.has(id)) App.exclude.delete(id);
                    else App.exclude.add(id);
                    el.classList.toggle("selected");
                });
            })(items[i]);
        }
    },

    renderHistory: function() {
        var list = document.getElementById("history-list");
        if (!this.data.history.length) {
            list.innerHTML = '<div class="empty">暂无历史记录</div>'; return;
        }
        var html = "";
        for (var i = 0; i < this.data.history.length; i++) {
            var h = this.data.history[i];
            var star = this.data.favorites.includes(h.id);
            var starIcon = star ? "\u2605" : "\u2606";
            html += '<div class="history-item">' +
                '<div class="history-info">' +
                    '<h3>' + h.food + '</h3>' +
                    '<p>' + h.location + ' ' + h.price + '元 于 ' + h.date + '</p>' +
                '</div>' +
                '<div class="history-right">' +
                    '<button class="star-btn' + (star ? " active" : "") +
                    '" onclick="App.star(' + h.id + ')">' + starIcon + '</button>' +
                '</div>' +
                '</div>';
        }
        list.innerHTML = html;
    },

    star: function(id) {
        var idx = this.data.favorites.indexOf(id);
        if (idx >= 0) this.data.favorites.splice(idx, 1);
        else this.data.favorites.push(id);
        this.saveToLS();
        this.renderHistory();
    },

    spin: function() {
        var self = this;
        if (this.busy) return;
        this.load();

        var body = { mode: this.mode };
        var foods = [];

        if (this.mode === "all") {
            foods = this.data.foods.slice();
            if (!foods.length) {
                alert("暂无符合条件的食物");
                return;
            }

        } else if (this.mode === "location") {
            var loc = document.getElementById("random-location").value;
            if (!loc) { alert("请选择地点"); return; }
            body.location = loc;
            for (var i = 0; i < this.data.foods.length; i++) {
                if (this.data.foods[i].location === loc) {
                    foods.push(this.data.foods[i]);
                }
            }
            if (!foods.length) {
                alert("暂无符合条件的食物");
                return;
            }

        } else if (this.mode === "price") {
            var minP = parseFloat(document.getElementById("price-min").value);
            var maxP = parseFloat(document.getElementById("price-max").value);
            if (isNaN(minP) || isNaN(maxP) || minP > maxP) {
                alert("价格范围无效");
                return;
            }
            body.min_price = minP;
            body.max_price = maxP;
            for (var i = 0; i < this.data.foods.length; i++) {
                if (this.data.foods[i].price >= minP && this.data.foods[i].price <= maxP) {
                    foods.push(this.data.foods[i]);
                }
            }
            if (!foods.length) {
                alert("价格范围内无食物");
                return;
            }

        } else if (this.mode === "exclude") {
            var iter = this.exclude.values();
            var item = iter.next();
            while (!item.done) {
                if (!body.exclude_ids) body.exclude_ids = [];
                body.exclude_ids.push(item.value);
                item = iter.next();
            }
            for (var i = 0; i < this.data.foods.length; i++) {
                if (!this.exclude.has(this.data.foods[i].id)) {
                    foods.push(this.data.foods[i]);
                }
            }
            if (!foods.length) {
                alert("请至少保留一个食物");
                return;
            }
        }

        if (!body.exclude_ids) body.exclude_ids = [];

        this.busy = true;
        var spinner = document.getElementById("spinner");
        var txt = document.getElementById("spinner-text");
        var btn = document.getElementById("spin-btn");
        var resultEl = document.getElementById("result");
        btn.disabled = true;
        resultEl.classList.add("hidden");
        spinner.classList.add("spinning");

        var dur = 2000, step = 80, total = dur / step;
        (function run(idx) {
            if (idx >= total) {
                var winner;
                if (foods.length > 0) {
                    winner = foods[Math.floor(Math.random() * foods.length)];
                }
                spinner.classList.remove("spinning");
                if (!winner) {
                    txt.textContent = "没有找到符合条件的食物";
                    self.busy = false;
                    btn.disabled = false;
                    return;
                }
                txt.textContent = winner.name;
                document.getElementById("result-food-text").textContent = winner.name;
                document.getElementById("result-location-text").textContent = winner.location;
                document.getElementById("result-price-text").textContent = winner.price + '元';
                resultEl.classList.remove("hidden");

                // 记录历史
                var hist = self.data.history;
                hist.unshift({
                    id: winner.id,
                    food: winner.name,
                    location: winner.location,
                    price: winner.price,
                    date: new Date().toLocaleString('zh-CN', {year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'}).replace(/\//g, '-')
                });
                self.data.history = hist;
                self.saveToLS();
                self.busy = false;
                btn.disabled = false;
            }
            var f = foods[Math.floor(Math.random() * foods.length)];
            txt.textContent = f.name;
            setTimeout(function() { run(idx + 1); }, step);
        })(0);
    },

    exportData: function() {
        var b = new Blob([JSON.stringify(this.data, null, 2)], { type: "application/json" });
        var a = document.createElement("a");
        a.href = URL.createObjectURL(b);
        a.download = "backup_" + new Date().toLocaleDateString() + ".json";
        a.click();
    },

    importData: function(e) {
        var file = e.target.files[0];
        if (!file) return;
        var reader = new FileReader();
        var self = this;
        reader.onload = function(ev) {
            try {
                var d = JSON.parse(ev.target.result);
                if (d.locations && d.foods && d.history !== undefined) {
                    self.data = d;
                    self.saveToLS();
                    self.renderLocList();
                    self.renderFoodList();
                    self.renderHistory();
                    self.updateLocSelect();
                    alert("导入成功");
                } else {
                    alert("格式不正确");
                }
            } catch(err) {
                alert("格式不正确");
            }
        };
        reader.readAsText(file);
        e.target.value = "";
    },

    load: function() {
        this.data = LS.load();
        if (!this.data) this.data = { locations: [], foods: [], history: [], favorites: [] };
    }
};

document.addEventListener("DOMContentLoaded", function() { App.init(); });
