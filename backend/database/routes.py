"""Database API routes for Flask"""
from flask import Blueprint, request, jsonify
from database.models import User, Project, File
from database.utils import get_user_stats, get_project_stats, search_projects, search_files
import hashlib

db_routes = Blueprint('db_routes', __name__)

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

# User routes
@db_routes.route('/users', methods=['GET'])
def get_users():
    try:
        users = User.get_all()
        return jsonify({'success': True, 'data': users})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@db_routes.route('/users', methods=['POST'])
def create_user():
    try:
        data = request.json
        user_id = User.create(data['name'], data['email'], hash_password(data['password']))
        return jsonify({'success': True, 'id': user_id})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@db_routes.route('/users/<int:user_id>', methods=['GET'])
def get_user(user_id):
    try:
        user = User.get_by_id(user_id)
        if user:
            return jsonify({'success': True, 'data': user})
        return jsonify({'success': False, 'error': 'User not found'}), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@db_routes.route('/users/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    try:
        data = request.json
        if 'password' in data:
            data['password_hash'] = hash_password(data.pop('password'))
        success = User.update(user_id, **data)
        return jsonify({'success': success})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@db_routes.route('/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    try:
        success = User.delete(user_id)
        return jsonify({'success': success})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@db_routes.route('/users/<int:user_id>/stats', methods=['GET'])
def user_stats(user_id):
    try:
        stats = get_user_stats(user_id)
        return jsonify({'success': True, 'data': stats})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# Project routes
@db_routes.route('/projects', methods=['GET'])
def get_projects():
    try:
        user_id = request.args.get('user_id')
        if user_id:
            projects = Project.get_by_user(int(user_id))
        else:
            projects = Project.get_all()
        return jsonify({'success': True, 'data': projects})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@db_routes.route('/projects', methods=['POST'])
def create_project():
    try:
        data = request.json
        project_id = Project.create(data['user_id'], data['title'], data.get('description', ''), data.get('status', 'active'))
        return jsonify({'success': True, 'id': project_id})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@db_routes.route('/projects/<int:project_id>', methods=['GET'])
def get_project(project_id):
    try:
        project = Project.get_by_id(project_id)
        if project:
            return jsonify({'success': True, 'data': project})
        return jsonify({'success': False, 'error': 'Project not found'}), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@db_routes.route('/projects/<int:project_id>', methods=['PUT'])
def update_project(project_id):
    try:
        data = request.json
        success = Project.update(project_id, **data)
        return jsonify({'success': success})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@db_routes.route('/projects/<int:project_id>', methods=['DELETE'])
def delete_project(project_id):
    try:
        success = Project.delete(project_id)
        return jsonify({'success': success})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@db_routes.route('/projects/<int:project_id>/stats', methods=['GET'])
def project_stats(project_id):
    try:
        stats = get_project_stats(project_id)
        return jsonify({'success': True, 'data': stats})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# File routes
@db_routes.route('/files', methods=['GET'])
def get_files():
    try:
        project_id = request.args.get('project_id')
        if project_id:
            files = File.get_by_project(int(project_id))
        else:
            files = File.get_all()
        return jsonify({'success': True, 'data': files})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@db_routes.route('/files', methods=['POST'])
def create_file():
    try:
        data = request.json
        file_id = File.create(data['project_id'], data['filename'], data['filepath'], data.get('filesize', 0), data.get('filetype', ''))
        return jsonify({'success': True, 'id': file_id})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@db_routes.route('/files/<int:file_id>', methods=['GET'])
def get_file(file_id):
    try:
        file = File.get_by_id(file_id)
        if file:
            return jsonify({'success': True, 'data': file})
        return jsonify({'success': False, 'error': 'File not found'}), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@db_routes.route('/files/<int:file_id>', methods=['PUT'])
def update_file(file_id):
    try:
        data = request.json
        success = File.update(file_id, **data)
        return jsonify({'success': success})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@db_routes.route('/files/<int:file_id>', methods=['DELETE'])
def delete_file(file_id):
    try:
        success = File.delete(file_id)
        return jsonify({'success': success})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# Search routes
@db_routes.route('/search/projects', methods=['GET'])
def search_projects_route():
    try:
        query = request.args.get('q', '')
        results = search_projects(query)
        return jsonify({'success': True, 'data': results})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@db_routes.route('/search/files', methods=['GET'])
def search_files_route():
    try:
        query = request.args.get('q', '')
        results = search_files(query)
        return jsonify({'success': True, 'data': results})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


