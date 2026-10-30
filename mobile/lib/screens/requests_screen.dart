import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../api_client.dart';
import 'request_form_screen.dart';

class RequestsScreen extends StatefulWidget {
  const RequestsScreen({super.key});
  @override
  State<RequestsScreen> createState() => _RequestsScreenState();
}

class _RequestsScreenState extends State<RequestsScreen> {
  List _requests = [];
  bool _loading = true;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    try { _requests = await Api.get('/requests/my'); } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  Color _statusColor(String s) => switch (s) {
    'approved' => Colors.green,
    'rejected' => Colors.red,
    _ => Colors.orange,
  };
  String _statusLabel(String s) => switch (s) {
    'approved' => 'تمت الموافقة',
    'rejected' => 'مرفوض',
    'cancelled' => 'ملغي',
    _ => 'قيد المراجعة',
  };

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('طلباتي')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          await Navigator.push(context, MaterialPageRoute(builder: (_) => const RequestFormScreen()));
          _load();
        },
        icon: const Icon(Icons.add),
        label: const Text('طلب جديد'),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _requests.isEmpty
              ? const Center(child: Text('لا توجد طلبات بعد'))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView.separated(
                    padding: const EdgeInsets.all(12),
                    itemCount: _requests.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (_, i) {
                      final r = _requests[i];
                      return Card(
                        child: ListTile(
                          leading: CircleAvatar(
                            backgroundColor: _statusColor(r['status']).withOpacity(.15),
                            child: Icon(Icons.description, color: _statusColor(r['status'])),
                          ),
                          title: Text(r['name_ar'] ?? ''),
                          subtitle: Text(
                            '${DateFormat('yyyy-MM-dd').format(DateTime.parse(r['start_datetime']))} → '
                            '${DateFormat('yyyy-MM-dd').format(DateTime.parse(r['end_datetime']))}',
                          ),
                          trailing: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: _statusColor(r['status']).withOpacity(.15),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(_statusLabel(r['status']),
                                style: TextStyle(color: _statusColor(r['status']), fontSize: 12)),
                          ),
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}