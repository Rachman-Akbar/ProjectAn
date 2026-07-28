# Struktur Database Marketplace Internal

Urutan tabel utama:

1. `categories`
2. `product_attributes`
3. `products`
4. `product_attribute_values`
5. `product_variants`
6. `product_variant_values`
7. `product_images`
8. `product_categories`
9. `customers`
10. `orders`
11. `order_items`
12. `order_status_histories`

Aturan utama:

- Marketplace menggunakan satu katalog global perusahaan.
- Tidak ada tabel toko atau `store_id`.
- Email unik berada pada tabel `customers`.
- Satu customer dapat mempunyai banyak order.
- `customers.customer_type` membedakan `individual` dan `business`.
- Data badan usaha tersimpan pada customer dan disalin sebagai snapshot pada order.
- `guest_division` tidak digunakan.
- Kategori memiliki `sort_order` untuk menentukan urutan mega menu.
- Produk tanpa pilihan variant tetap mempunyai satu variant `Default`.
- Snapshot atribut variant disimpan pada `order_items.variant_attributes`.
