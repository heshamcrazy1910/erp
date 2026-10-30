import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../api_client.dart';
import 'login_screen.dart';
import 'requests_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  String _nextAction = 'in';
  bool _busy = false;
  String _status = 'اضغط لتسجيل البصمة';

  @override
  void initState() {
    super.initState();
    _loadToday();
  }

  Future<void> _loadToday() async {
    try {
      final data = await Api.get('/attendance/today');
      setState(() {
        _nextAction = data['next_action'];
        _status = _nextAction == 'done' ? 'تم إكمال بصمة اليوم ✅' : 'اضغط لتسجيل البصمة';
      });
    } catch (_) {}
  }

  Future<void> _punch() async {
    if (_nextAction == 'done') return;
    setState(() { _busy = true; _status = 'جاري التحقق من الموقع...'; });
    try {
      if (!await Geolocator.isLocationServiceEnabled()) throw Exception('خدمة الموقع غير مفعلة');
      var perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) perm = await Geolocator.requestPermission();
      if (perm == LocationPermission.deniedForever) throw Exception('صلاحية الموقع مرفوضة');

      final pos = await Geolocator.getCurrentPosition(
          desiredAccuracy: LocationAccuracy.high);
      final isMock = pos.isMocked;

      final res = await Api.post('/attendance/check', {
        'lat': pos.latitude,
        'lng': pos.longitude,
        'type': _nextAction,
        'is_mock': isMock,
        'device_info': {'platform': 'flutter', 'accuracy': pos.accuracy},
      });

      setState(() {
        _status = 'تم تسجيل ${_nextAction == 'in' ? "الحضور" : "الانصراف"} بنجاح ✅';
      });
      await _loadToday();
    } catch (e) {
      setState(() => _status = e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _logout() async {
    final sp = await SharedPreferences.getInstance();
    await sp.remove('token');
    if (!mounted) return;
    Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const LoginScreen()));
  }

  @override
  Widget build(BuildContext context) {
    final isIn = _nextAction == 'in';
    return Scaffold(
      appBar: AppBar(
        title: const Text('الرئيسية'),
        actions: [
          IconButton(icon: const Icon(Icons.list_alt), onPressed: () {
            Navigator.push(context, MaterialPageRoute(builder: (_) => const RequestsScreen()));
          }),
          IconButton(icon: const Icon(Icons.logout), onPressed: _logout),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            const SizedBox(height: 20),
            Container(
              width: 180, height: 180,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: isIn ? Colors.teal.shade50 : Colors.orange.shade50,
                border: Border.all(color: isIn ? Colors.teal : Colors.orange, width: 4),
              ),
              child: Center(
                child: Icon(isIn ? Icons.fingerprint : Icons.exit_to_app,
                    size: 80, color: isIn ? Colors.teal : Colors.orange),
              ),
            ),
            const SizedBox(height: 24),
            Text(
              _nextAction == 'done' ? 'اكتملت بصمة اليوم'
                  : (isIn ? 'تسجيل الحضور' : 'تسجيل الانصراف'),
              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            Text(_status, textAlign: TextAlign.center, style: const TextStyle(color: Colors.grey)),
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity, height: 54,
              child: ElevatedButton.icon(
                onPressed: _busy || _nextAction == 'done' ? null : _punch,
                icon: _busy
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : const Icon(Icons.my_location),
                label: Text(_busy ? 'جاري...' : (isIn ? 'بصمة حضور' : 'بصمة انصراف')),
              ),
            ),
            const SizedBox(height: 16),
            OutlinedButton.icon(
              onPressed: () => Navigator.push(context,
                  MaterialPageRoute(builder: (_) => const RequestsScreen())),
              icon: const Icon(Icons.description),
              label: const Text('طلباتي (إجازة / عارضة / إذن)'),
            ),
          ],
        ),
      ),
    );
  }
}