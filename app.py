from flask import Flask, render_template, request, jsonify
from robot_simulator import execute_code, Field

app = Flask(__name__)
field = Field()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/run', methods=['POST'])
def run_code():
    data = request.json
    code = data['code']
    result = execute_code(code, field)
    return jsonify(result)

@app.route('/update_field', methods=['POST'])
def update_field():
    data = request.json
    field.update(data)
    return jsonify(status="success")

if __name__ == '__main__':
    app.run(debug=True)