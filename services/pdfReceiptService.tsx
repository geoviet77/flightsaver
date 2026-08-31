import React from 'react';
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer';
import { createAdminClient } from '@/lib/supabase/admin';

export interface ReceiptData {
  orderId: string;
  pnr: string;
  eTicketNumber?: string;
  airline: string;
  flightNumber?: string;
  route: string;
  originCity: string;
  destinationCity: string;
  departureDate: string;
  departureTime?: string;
  passengers: Array<{
    firstName: string;
    lastName: string;
    passport?: string;
    passportNumber?: string;
  }>;
  totalPrice: number;
  currency: string;
  serviceType: 'assistant' | 'club';
  serviceFee: number;
  fxBuffer: number;
  netFare: number;
  stpcHotelIncluded: boolean;
  stpcHotelName?: string;
  contactEmail: string;
  createdAt: string;
}

// PDF Document Styles
const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#1e293b',
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#2563eb',
    paddingBottom: 16,
    marginBottom: 20,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1d4ed8',
  },
  brandSubtitle: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: '#dcfce7',
    color: '#15803d',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
    marginTop: 12,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {
    color: '#64748b',
    fontSize: 9,
  },
  value: {
    fontWeight: 'bold',
    fontSize: 10,
    color: '#0f172a',
  },
  pnrHighlight: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2563eb',
    letterSpacing: 2,
  },
  stpcBanner: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
  },
  stpcTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#065f46',
  },
  stpcDesc: {
    fontSize: 8.5,
    color: '#047857',
    marginTop: 2,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    padding: 6,
    borderRadius: 4,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: 'row',
    padding: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  col1: { width: '40%' },
  col2: { width: '35%' },
  col3: { width: '25%', textAlign: 'right' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 2,
    borderTopColor: '#0f172a',
    paddingTop: 8,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  totalAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1d4ed8',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 36,
    right: 36,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    color: '#94a3b8',
    fontSize: 8,
  },
});

export const ReceiptPdfDocument: React.FC<{ data: ReceiptData }> = ({ data }) => {
  const currencySymbol =
    data.currency === 'RUB' ? 'RUB' : data.currency === 'USD' ? 'USD' : data.currency === 'EUR' ? 'EUR' : data.currency;

  return (
    <Document title={`Маршрутная квитанция FlightSaver - ${data.orderId}`}>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brandTitle}>FlightSaver</Text>
            <Text style={styles.brandSubtitle}>Электронная маршрутная квитанция и фискальный отчет</Text>
          </View>
          <View style={styles.statusBadge}>
            <Text>ОПЛАЧЕНО / CONFIRMED</Text>
          </View>
        </View>

        {/* Booking Details Card */}
        <View style={styles.card}>
          <View style={styles.row}>
            <View>
              <Text style={styles.label}>НОМЕР ЗАКАЗА</Text>
              <Text style={styles.value}>{data.orderId}</Text>
            </View>
            <View>
              <Text style={styles.label}>КОД БРОНИРОВАНИЯ (PNR)</Text>
              <Text style={styles.pnrHighlight}>{data.pnr}</Text>
            </View>
            <View>
              <Text style={styles.label}>ЭЛЕКТРОННЫЙ БИЛЕТ</Text>
              <Text style={styles.value}>{data.eTicketNumber || `235-${data.pnr}`}</Text>
            </View>
            <View>
              <Text style={styles.label}>ДАТА ОФОРМЛЕНИЯ</Text>
              <Text style={styles.value}>{new Date(data.createdAt).toLocaleDateString('ru-RU')}</Text>
            </View>
          </View>
        </View>

        {/* Flight Information */}
        <Text style={styles.sectionTitle}>Информация о перелете</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View>
              <Text style={styles.label}>МАРШРУТ</Text>
              <Text style={styles.value}>{data.route}</Text>
            </View>
            <View>
              <Text style={styles.label}>АВИАКОМПАНИЯ</Text>
              <Text style={styles.value}>{data.airline}</Text>
            </View>
            <View>
              <Text style={styles.label}>ДАТА ВЫЛЕТА</Text>
              <Text style={styles.value}>{data.departureDate}</Text>
            </View>
          </View>
        </View>

        {/* STPC Hotel Voucher (if included) */}
        {data.stpcHotelIncluded && (
          <View style={styles.stpcBanner}>
            <Text style={styles.stpcTitle}>★ ПОДТВЕРЖДЕН ВАУЧЕР STPC (БЕСПЛАТНЫЙ ТРАНЗИТНЫЙ ОТЕЛЬ)</Text>
            <Text style={styles.stpcDesc}>
              Отель: {data.stpcHotelName || 'Партнерский 4★ отель авиакомпании в транзитном хабе'}. Включает трансфер и питание.
            </Text>
          </View>
        )}

        {/* Passengers */}
        <Text style={styles.sectionTitle}>Пассажиры</Text>
        <View style={styles.card}>
          {data.passengers.map((p, idx) => (
            <View key={idx} style={[styles.row, { marginBottom: 4 }]}>
              <Text style={styles.value}>
                {idx + 1}. {p.lastName.toUpperCase()} / {p.firstName.toUpperCase()}
              </Text>
              <Text style={styles.label}>
                Паспорт: {p.passport || p.passportNumber || 'Указан при бронировании'}
              </Text>
            </View>
          ))}
        </View>

        {/* Payment & Breakdown */}
        <Text style={styles.sectionTitle}>Финансовая детализация</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Базовый тариф поставщика (Net Fare):</Text>
            <Text style={styles.value}>{data.netFare.toLocaleString()} {currencySymbol}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>FX-буфер конвертации (1.5%):</Text>
            <Text style={styles.value}>+{data.fxBuffer.toLocaleString()} {currencySymbol}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>
              Сервисный сбор ({data.serviceType === 'assistant' ? 'Консьерж 24/7' : 'FlightSaver Club'}):
            </Text>
            <Text style={styles.value}>
              {data.serviceFee > 0 ? `+${data.serviceFee.toLocaleString()} ${currencySymbol}` : '0 RUB (Бесплатно)'}
            </Text>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>ИТОГО ОПЛАЧЕНО:</Text>
            <Text style={styles.totalAmount}>{data.totalPrice.toLocaleString()} {currencySymbol}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>FlightSaver AI Travel Platform • Служба поддержки: support@flightsaver.io • 24/7</Text>
          <Text>Страница 1 из 1</Text>
        </View>
      </Page>
    </Document>
  );
};

export class PdfReceiptService {
  /**
   * Генерация бинарного PDF буфера
   */
  public static async generateReceiptPdfBuffer(data: ReceiptData): Promise<Buffer> {
    const documentElement = React.createElement(ReceiptPdfDocument, { data });
    return await renderToBuffer(documentElement as any);
  }

  /**
   * Генерация PDF и сохранение в Supabase Storage (бакет 'receipts')
   */
  public static async generateAndUploadReceipt(data: ReceiptData): Promise<string> {
    const buffer = await this.generateReceiptPdfBuffer(data);
    const fileName = `${data.orderId}/receipt_${data.orderId}.pdf`;

    try {
      const supabase = createAdminClient();
      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, buffer, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage
          .from('receipts')
          .getPublicUrl(fileName);

        const receiptUrl = publicUrlData.publicUrl;

        // Сохранение ссылки в таблицу orders
        await supabase
          .from('orders')
          .update({ receipt_url: receiptUrl })
          .or(`order_reference.eq.${data.orderId},id.eq.${data.orderId}`);

        return receiptUrl;
      }
    } catch (storageErr) {
      console.warn('[PdfReceiptService] Supabase Storage notice:', storageErr);
    }

    // Fallback: локальный роут отдачи квитанции
    return `/api/receipts/${data.orderId}`;
  }
}
