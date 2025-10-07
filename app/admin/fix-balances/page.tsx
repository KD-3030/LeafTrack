'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function FixInvoiceBalancesPage() {
  const [isFixing, setIsFixing] = useState(false);
  const [results, setResults] = useState<any>(null);

  const fixInvoiceBalances = async () => {
    if (!confirm('This will recalculate ALL invoice balances based on payment records. Continue?')) {
      return;
    }

    try {
      setIsFixing(true);
      setResults(null);

      const token = localStorage.getItem('leaftrack_token');
      const response = await fetch('/api/fix-invoice-balances', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setResults(data.results);
        toast.success(`Successfully updated ${data.results.updated} invoices!`);
      } else {
        toast.error(data.error || 'Failed to fix invoice balances');
      }
    } catch (error) {
      console.error('Error fixing invoice balances:', error);
      toast.error('Failed to fix invoice balances');
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertCircle className="h-6 w-6 mr-2 text-orange-500" />
            Fix Invoice Balances
          </CardTitle>
          <CardDescription>
            Recalculate all invoice paid_amount and balance_due based on actual payment records.
            Use this if you see a mismatch between payment history and outstanding balances.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-800 mb-2">⚠️ What this does:</h3>
            <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
              <li>Scans all invoices in the database</li>
              <li>Calculates total payments for each invoice</li>
              <li>Updates invoice paid_amount and balance_due</li>
              <li>Updates payment_status (Pending/Partial/Paid)</li>
              <li>Fixes outstanding balance calculations</li>
            </ul>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 mb-2">ℹ️ When to use:</h3>
            <ul className="list-disc list-inside text-sm text-blue-700 space-y-1">
              <li>Payments were recorded but invoice balances didn't update</li>
              <li>Outstanding balance doesn't match payment history</li>
              <li>After importing historical data</li>
              <li>To fix data inconsistencies</li>
            </ul>
          </div>

          <Button
            onClick={fixInvoiceBalances}
            disabled={isFixing}
            className="w-full"
            size="lg"
          >
            {isFixing ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Recalculating Invoices...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Fix All Invoice Balances
              </>
            )}
          </Button>

          {results && (
            <div className="mt-6 border rounded-lg p-4 space-y-4">
              <h3 className="font-semibold text-lg">Results</h3>
              
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-600">Total Processed</p>
                  <p className="text-2xl font-bold">{results.total}</p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-600">Updated</p>
                  <p className="text-2xl font-bold text-green-600">{results.updated}</p>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-600">Unchanged</p>
                  <p className="text-2xl font-bold text-blue-600">{results.unchanged}</p>
                </div>
                <div className="bg-red-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-600">Errors</p>
                  <p className="text-2xl font-bold text-red-600">{results.errors}</p>
                </div>
              </div>

              {results.sample_updates && results.sample_updates.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold mb-2">Sample Updates (first 20):</h4>
                  <div className="max-h-96 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-2 py-1 text-left">Invoice #</th>
                          <th className="px-2 py-1 text-right">Payments</th>
                          <th className="px-2 py-1 text-right">Old Paid</th>
                          <th className="px-2 py-1 text-right">New Paid</th>
                          <th className="px-2 py-1 text-right">Old Due</th>
                          <th className="px-2 py-1 text-right">New Due</th>
                          <th className="px-2 py-1 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.sample_updates.map((update: any, idx: number) => (
                          <tr key={idx} className="border-t">
                            <td className="px-2 py-1 font-medium">{update.invoice_number}</td>
                            <td className="px-2 py-1 text-right">{update.payment_count}</td>
                            <td className="px-2 py-1 text-right text-gray-500">₹{update.old_paid.toLocaleString()}</td>
                            <td className="px-2 py-1 text-right text-green-600 font-semibold">₹{update.new_paid.toLocaleString()}</td>
                            <td className="px-2 py-1 text-right text-gray-500">₹{update.old_due.toLocaleString()}</td>
                            <td className="px-2 py-1 text-right text-orange-600 font-semibold">₹{update.new_due.toLocaleString()}</td>
                            <td className="px-2 py-1 text-center">
                              <span className="text-xs">{update.old_status} → {update.new_status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-700">
                  ✅ Invoice balances have been recalculated! Outstanding balances should now be accurate.
                  Refresh the customer list to see updated amounts.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
