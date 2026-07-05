from flask import Flask, render_template, jsonify
import yaml

app = Flask(__name__)

# Load configuration
with open('config.yaml', 'r') as file:
    config = yaml.safe_load(file)

@app.route('/')
def index():
    return render_template('index.html', config=config)

@app.route('/api/links')
def get_links():
    return jsonify(config['quick_launch'] + config['links'])

@app.route('/api/widgets/<widget_type>')
def get_widget(widget_type):
    widgets = [w for w in config['widgets'] if w['type'] == widget_type]
    return jsonify(widgets)

if __name__ == '__main__':
    app.run(debug=True)