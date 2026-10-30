import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../api_client.dart';

class RequestFormScreen extends StatefulWidget {
  const RequestFormScreen({super.key});
  @override
  State<RequestFormScreen> createState() => _RequestFormScreenState();
}

class _RequestFormScreenState extends State<RequestFormScreen> {
  List _types = [];
  String? _typeId;
  DateTime _start = DateTime.now();
  DateTime _end = DateTime.now();
  final _reason = TextEditingController();
  bool _busy = false;

  @override
  void initState() { super.initState(); _loadTypes(); }

  Future<void> _loadTypes() async {
    final types = await Api.get('/requests/types');
    setState(() {
      _types = types;
      _typeId ??= _types.isNotEmpty ? _types.first['id'] : null;
    });
  }

  Future<void> _pick(bool isStart) async {
    final d = await showDatePicker(
      context: context,
      initialDate: isStart ? _start : _end,
      firstDate: DateTime.now().subtract(const Duration(days: 30)),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (d != null) setState(() => isStart ? _start = d : _end = d);
  }

  Future<void> _submit() async {
    if (_typeId == null) return;
    setState(() => _busy = true);
    try {
      await Api.post('/requests', {
        'request_type_id': _typeId,
        'start_datetime': _start.toUtc().toIso8601String(),
        'end_datetime': _end.toUtc().toIso8601String(),
        'reason': _reason.text.trim(),
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('تم إرسال الطلب بنجاح ✅')));
      Navigator.pop(context);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString().replaceFirst('Exception: ', ''))));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final fmt = DateFormat('yyyy-MM-dd');
    return Scaffold(
      appBar: AppBar(title: const Text('طلب جديد')),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        DropdownButtonFormField<String>(
          value: _typeId,
          decoration: const InputDecoration(labelText: 'نوع الطلب', border: OutlineInputBorder()),
          items: _types.map<DropdownMenuItem<String>>((t) => DropdownMenuItem(
                value: t['id'] as String,
                child: Text(t['name_ar'] as String),
              )).toList(),
          onChanged: (v) => setState(() => _typeId = v),
        ),
        const SizedBox(height: 16),
        ListTile(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8), side: const BorderSide(color: Colors.grey)),
          title: const Text('تاريخ البداية'),
          trailing: Text(fmt.format(_start)),
          onTap: () => _pick(true),
        ),
        const SizedBox(height: 12),
        ListTile(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8), side: const BorderSide(color: Colors.grey)),
          title: const Text('تاريخ النهاية'),
          trailing: Text(fmt.format(_end)),
          onTap: () => _pick(false),
        ),
        const SizedBox(height: 16),
        TextField(
          controller: _reason,
          maxLines: 3,
          decoration: const InputDecoration(labelText: 'السبب', border: OutlineInputBorder()),
        ),
        const SizedBox(height: 24),
        SizedBox(
          height: 50,
          child: ElevatedButton(
            onPressed: _busy ? null : _submit,
            child: _busy
                ? const CircularProgressIndicator(color: Colors.white)
                : const Text('إرسال الطلب'),
          ),
        ),
      ]),
    );
  }
}