import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

// Android emulator: use 10.0.2.2 → host. Real device: use your LAN IP.
const String kBaseUrl = 'http://10.0.2.2:3000/api/v1';

class Api {
  static Future<String?> _token() async {
    final sp = await SharedPreferences.getInstance();
    return sp.getString('token');
  }

  static Future<Map<String, String>> _headers() async {
    final t = await _token();
    return {
      'Content-Type': 'application/json',
      if (t != null) 'Authorization': 'Bearer $t',
    };
  }

  static Future<dynamic> post(String path, Map<String, dynamic> body) async {
    final res = await http.post(Uri.parse('$kBaseUrl$path'),
        headers: await _headers(), body: jsonEncode(body));
    return _handle(res);
  }

  static Future<dynamic> get(String path) async {
    final res = await http.get(Uri.parse('$kBaseUrl$path'), headers: await _headers());
    return _handle(res);
  }

  static Future<dynamic> patch(String path, [Map<String, dynamic>? body]) async {
    final res = await http.patch(Uri.parse('$kBaseUrl$path'),
        headers: await _headers(), body: jsonEncode(body ?? {}));
    return _handle(res);
  }

  static dynamic _handle(http.Response res) {
    final data = res.body.isNotEmpty ? jsonDecode(res.body) : {};
    if (res.statusCode >= 400) {
      throw Exception(data['error'] ?? 'خطأ غير معروف');
    }
    return data;
  }
}