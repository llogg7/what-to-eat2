import json, os, random
from datetime import datetime
from flask import Flask, render_template, request, jsonify, send_from_directory

app = Flask(__name__, static_folder='.', static_url_path='')

DATA_DIR = os.path.join(os.path.dirname(__file__), 'user_data')
os.makedirs(DATA_DIR, exist_ok=True)

def get_data_path():
    return os.path.join(os.path.dirname(__file__), 'data.json')

def load_data():
    path = get_data_path()
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8-sig') as f:
            return json.load(f)
    return {"locations": [], "foods": [], "history": [], "favorites": []}

def save_data(d):
    path = get_data_path()
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(d, f, ensure_ascii=False, indent=2)

if not os.path.exists(get_data_path()):
    save_data(load_data())

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/data')
def get_data():
    return jsonify(load_data())

@app.route('/api/locations', methods=['POST'])
def add_loc():
    d = load_data()
    name = request.json.get('name', '').strip()
    if not name:
        return jsonify({"error": "名称不能为空"}), 400
    if name in d["locations"]:
        return jsonify({"error": "该地点已存在"}), 400
    d["locations"].append(name)
    save_data(d)
    return jsonify({"success": True, "locations": d["locations"]})

@app.route('/api/locations/<name>', methods=['DELETE'])
def del_loc(name):
    d = load_data()
    d["locations"] = [l for l in d["locations"] if l != name]
    d["foods"] = [f for f in d["foods"] if f["location"] != name]
    save_data(d)
    return jsonify({"success": True})

@app.route('/api/foods', methods=['POST'])
def add_food():
    d = load_data()
    loc = request.json.get('location', '').strip()
    name = request.json.get('name', '').strip()
    price = float(request.json.get('price', 0))
    if not loc or not name:
        return jsonify({"error": "信息不完整"}), 400
    if loc not in d["locations"]:
        return jsonify({"error": "地点不存在"}), 400
    fid = max([f["id"] for f in d["foods"]], default=0) + 1
    d["foods"].append({"id": fid, "location": loc, "name": name, "price": price})
    save_data(d)
    return jsonify({"success": True, "foods": d["foods"]})

@app.route('/api/foods/<int:fid>', methods=['DELETE'])
def del_food(fid):
    d = load_data()
    d["foods"] = [f for f in d["foods"] if f["id"] != fid]
    save_data(d)
    return jsonify({"success": True})

@app.route('/api/random', methods=['POST'])
def random_choice():
    d = load_data()
    mode = request.json.get('mode', 'all')
    exclude_ids = request.json.get('exclude_ids', [])
    min_price = request.json.get('min_price')
    max_price = request.json.get('max_price')
    location = request.json.get('location')

    candidates = [f for f in d["foods"] if f["id"] not in exclude_ids]

    if mode == 'location' and location:
        candidates = [f for f in candidates if f["location"] == location]
        if min_price is not None:
            candidates = [f for f in candidates if f["price"] >= min_price]
        if max_price is not None:
            candidates = [f for f in candidates if f["price"] <= max_price]
    elif mode == 'price':
        if min_price is not None:
            candidates = [f for f in candidates if f["price"] >= min_price]
        if max_price is not None:
            candidates = [f for f in candidates if f["price"] <= max_price]

    if not candidates:
        return jsonify({"error": "没有找到符合条件的食物"}), 400

    result = random.choice(candidates)

    hist = d["history"]
    hist.insert(0, {
        "id": result["id"],
        "food": result["name"],
        "location": result["location"],
        "price": result["price"],
        "date": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    })
    d["history"] = hist
    save_data(d)

    return jsonify({"success": True, "result": result})

@app.route('/api/history')
def get_history():
    return jsonify(load_data()["history"])

@app.route('/api/favorites', methods=['POST'])
def toggle_fav():
    d = load_data()
    fid = request.json.get('food_id')
    if fid in d["favorites"]:
        d["favorites"].remove(fid)
    else:
        d["favorites"].append(fid)
    save_data(d)
    return jsonify({"favorites": d["favorites"]})

@app.route('/api/import', methods=['POST'])
def import_data():
    save_data(request.json)
    return jsonify({"success": True})

@app.route('/api/export')
def export_data():
    return jsonify(load_data())

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
