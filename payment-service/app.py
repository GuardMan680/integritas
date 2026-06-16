import os, time
import psycopg2
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

DB_HOST = os.getenv('DB_HOST', 'payment-db')
DB_NAME = os.getenv('DB_NAME', 'payment_db')
DB_USER = os.getenv('DB_USER', 'payment_user')
DB_PASSWORD = os.getenv('DB_PASSWORD', 'payment_password')
DB_PORT = os.getenv('DB_PORT', '5432')
BOOKING_SERVICE_URL = os.getenv('BOOKING_SERVICE_URL', 'http://booking-service:3002')

conn = None

def connect_with_retry(retries=20, delay=3):
    global conn
    for i in range(1, retries + 1):
        try:
            conn = psycopg2.connect(host=DB_HOST, database=DB_NAME,
                user=DB_USER, password=DB_PASSWORD, port=DB_PORT)
            print('Payment Service terhubung ke PostgreSQL')
            return
        except Exception as e:
            print(f'Menunggu PostgreSQL... percobaan {i}')
            time.sleep(delay)
    raise Exception('Gagal terhubung ke PostgreSQL')

def init_database():
    cur = conn.cursor()
    cur.execute('''
        CREATE TABLE IF NOT EXISTS payments (
            id SERIAL PRIMARY KEY,
            booking_id VARCHAR(100) NOT NULL,
            user_name VARCHAR(100) NOT NULL,
            amount INT NOT NULL,
            method VARCHAR(50) NOT NULL,
            status VARCHAR(50) DEFAULT \'pending\',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    cur.close()

@app.route('/health', methods=['GET'])
def health():
    return jsonify({ 'service': 'payment-service', 'language': 'Python',
        'framework': 'Flask', 'database': 'postgresql', 'status': 'running' })

@app.route('/payments', methods=['GET'])
def get_payments():
    cur = conn.cursor()
    cur.execute('SELECT id, booking_id, user_name, amount, method, status, created_at FROM payments ORDER BY created_at DESC')
    rows = cur.fetchall()
    cur.close()
    data = [{'id': r[0], 'booking_id': r[1], 'user_name': r[2], 'amount': r[3],
             'method': r[4], 'status': r[5], 'created_at': str(r[6])} for r in rows]
    return jsonify({ 'service': 'payment-service', 'database': 'postgresql', 'data': data })

@app.route('/payments', methods=['POST'])
def create_payment():
    body = request.get_json()
    booking_id = body.get('booking_id')
    user_name = body.get('user_name')
    amount = body.get('amount')
    method = body.get('method', 'transfer')
    if not booking_id or not user_name or not amount:
        return jsonify({'message': 'booking_id, user_name, amount wajib diisi'}), 400
    cur = conn.cursor()
    cur.execute('INSERT INTO payments (booking_id, user_name, amount, method) VALUES (%s, %s, %s, %s) RETURNING id',
        (booking_id, user_name, amount, method))
    new_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    return jsonify({ 'service': 'payment-service', 'message': 'Pembayaran berhasil dibuat',
        'data': { 'id': new_id, 'booking_id': booking_id, 'user_name': user_name,
                  'amount': amount, 'method': method, 'status': 'pending' } }), 201

@app.route('/payments/<int:id>/status', methods=['PUT'])
def update_payment_status(id):
    body = request.get_json()
    status = body.get('status')
    allowed = ['pending', 'paid', 'failed', 'refunded']
    if status not in allowed:
        return jsonify({'message': 'Status tidak valid', 'allowed': allowed}), 400
    cur = conn.cursor()
    cur.execute('UPDATE payments SET status = %s WHERE id = %s', (status, id))
    conn.commit()
    cur.close()
    return jsonify({ 'service': 'payment-service', 'message': 'Status pembayaran diperbarui' })

@app.route('/payments/<int:id>', methods=['DELETE'])
def delete_payment(id):
    cur = conn.cursor()
    cur.execute('SELECT id FROM payments WHERE id = %s', (id,))
    if not cur.fetchone():
        cur.close()
        return jsonify({'message': 'Payment tidak ditemukan'}), 404
    cur.execute('DELETE FROM payments WHERE id = %s', (id,))
    conn.commit()
    cur.close()
    return jsonify({'service': 'payment-service', 'message': 'Pembayaran berhasil dihapus'})


@app.route('/payments/booking/<booking_id>', methods=['GET'])
def get_payment_by_booking(booking_id):
    cur = conn.cursor()
    cur.execute('SELECT id, booking_id, user_name, amount, method, status, created_at FROM payments WHERE booking_id = %s', (booking_id,))
    rows = cur.fetchall()
    cur.close()
    data = [{'id': r[0], 'booking_id': r[1], 'user_name': r[2], 'amount': r[3],
             'method': r[4], 'status': r[5], 'created_at': str(r[6])} for r in rows]
    return jsonify({ 'service': 'payment-service', 'data': data })

if __name__ == '__main__':
    connect_with_retry()
    init_database()
    app.run(host='0.0.0.0', port=3003)
