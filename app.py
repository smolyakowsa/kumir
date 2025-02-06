from flask import Flask, render_template, request, jsonify
from robot_simulator import execute_code, Field

app = Flask(__name__)
field = Field()

# Главная страница
@app.route('/')
def index():
    return render_template('index.html')

# Запуск кода
@app.route('/api/run', methods=['POST'])
def run_code():
    data = request.json
    code = data.get('code', '')
    try:
        result = execute_code(code, field)
        return jsonify(result)
    except Exception as e:
        return jsonify(error=str(e)), 400

# Получение и обновление состояния поля
@app.route('/api/field', methods=['GET', 'POST'])
def handle_field():
    if request.method == 'POST':
        data = request.json
        field.update(data)
        return jsonify(status="success")
    return jsonify(field.get_state())

if __name__ == '__main__':
    app.run(debug=True)