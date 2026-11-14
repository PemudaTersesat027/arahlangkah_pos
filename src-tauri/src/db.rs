use std::{net::IpAddr, path::PathBuf, sync::Mutex};

use argon2::{
    Argon2,
    password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
};
use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};
use chrono::Utc;
use rand::rngs::OsRng;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use sqlx::{
    FromRow, SqlitePool,
    sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions},
};
use tauri::{AppHandle, Manager, State};
use uuid::Uuid;

pub struct AppState {
    pub pool: SqlitePool,
    scanner_active: Mutex<bool>,
}

impl AppState {
    pub fn new(pool: SqlitePool) -> Self {
        Self {
            pool,
            scanner_active: Mutex::new(false),
        }
    }
}

pub async fn init_pool(app: &AppHandle) -> Result<SqlitePool, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;
    std::fs::create_dir_all(&app_data_dir).map_err(|error| error.to_string())?;
    let database_path: PathBuf = app_data_dir.join("alpos.sqlite3");
    let options = SqliteConnectOptions::new()
        .filename(database_path)
        .create_if_missing(true)
        .foreign_keys(true)
        .journal_mode(SqliteJournalMode::Wal);
    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(options)
        .await
        .map_err(|error| error.to_string())?;
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .map_err(|error| error.to_string())?;
    Ok(pool)
}

#[derive(Debug, Serialize, FromRow)]
#[serde(rename_all = "camelCase")]
struct Business {
    name: String,
    #[sqlx(rename = "logo_data")]
    logo_data: String,
    address: String,
    phone: String,
    email: String,
    #[sqlx(rename = "owner_name")]
    owner_name: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BusinessForm {
    business_name: String,
    #[serde(default)]
    logo_data: String,
    #[serde(default)]
    address: String,
    #[serde(default)]
    phone: String,
    #[serde(default)]
    email: String,
    owner_name: String,
    username: String,
    user_id: String,
    password: String,
}

#[derive(Serialize, FromRow)]
#[serde(rename_all = "camelCase")]
struct Product {
    id: i64,
    name: String,
    sku: String,
    barcode: String,
    category: String,
    unit: String,
    #[sqlx(rename = "purchase_price")]
    purchase_price: f64,
    #[sqlx(rename = "sale_price")]
    sale_price: f64,
    stock: f64,
    #[sqlx(rename = "min_stock")]
    min_stock: f64,
    #[sqlx(rename = "image_data")]
    image_data: String,
    #[sqlx(rename = "image_attribution")]
    image_attribution: String,
    #[sqlx(rename = "image_source_url")]
    image_source_url: String,
    #[sqlx(rename = "image_license")]
    image_license: String,
    #[sqlx(rename = "image_license_url")]
    image_license_url: String,
    notes: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProductForm {
    name: String,
    #[serde(default)]
    sku: String,
    #[serde(default)]
    barcode: String,
    #[serde(default)]
    category: String,
    #[serde(default = "default_unit")]
    unit: String,
    #[serde(default)]
    purchase_price: String,
    sale_price: String,
    #[serde(default)]
    stock: String,
    #[serde(default)]
    min_stock: String,
    #[serde(default)]
    image_data: String,
    #[serde(default)]
    image_attribution: String,
    #[serde(default)]
    image_source_url: String,
    #[serde(default)]
    image_license: String,
    #[serde(default)]
    image_license_url: String,
    #[serde(default)]
    notes: String,
}

fn default_unit() -> String {
    "pcs".to_string()
}

fn parse_nonnegative(value: &str, label: &str) -> Result<f64, String> {
    let number = value
        .trim()
        .parse::<f64>()
        .map_err(|_| format!("{label} tidak valid."))?;
    if !number.is_finite() || number < 0.0 {
        return Err(format!("{label} tidak boleh negatif."));
    }
    Ok(number)
}

#[tauri::command]
pub async fn initialize(state: State<'_, AppState>) -> Result<Value, String> {
    let business = sqlx::query_as::<_, Business>(
        "SELECT name, logo_data, address, phone, email, owner_name FROM business WHERE id = 1",
    )
    .fetch_optional(&state.pool)
    .await
    .map_err(|error| error.to_string())?;
    Ok(json!({ "success": true, "needsSetup": business.is_none(), "business": business }))
}

#[tauri::command]
pub async fn get_settings(state: State<'_, AppState>) -> Result<Value, String> {
    let rows = sqlx::query_as::<_, (String, String)>("SELECT key, value FROM settings")
        .fetch_all(&state.pool)
        .await
        .map_err(|error| error.to_string())?;
    let values: std::collections::HashMap<String, String> = rows.into_iter().collect();
    Ok(json!({
        "success": true,
        "settings": {
            "showProductImages": values.get("show_product_images").map(|value| value != "false").unwrap_or(true),
            "scannerMode": values.get("scanner_mode").map(String::as_str).unwrap_or("hid")
        }
    }))
}

#[tauri::command]
pub async fn save_business(
    state: State<'_, AppState>,
    form: BusinessForm,
) -> Result<Value, String> {
    let business_name = form.business_name.trim();
    let owner_name = form.owner_name.trim();
    let username = form.username.trim();
    let user_id = form.user_id.trim();
    if business_name.is_empty()
        || owner_name.is_empty()
        || username.is_empty()
        || user_id.is_empty()
    {
        return Err("Lengkapi nama usaha, pemilik, username, dan ID pengguna.".to_string());
    }
    if form.password.chars().count() < 8 {
        return Err("Password harus terdiri dari minimal 8 karakter.".to_string());
    }

    let salt = SaltString::generate(&mut OsRng);
    let password_hash = Argon2::default()
        .hash_password(form.password.as_bytes(), &salt)
        .map_err(|error| error.to_string())?
        .to_string();
    let mut transaction = state
        .pool
        .begin()
        .await
        .map_err(|error| error.to_string())?;
    let already_setup: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM business")
        .fetch_one(&mut *transaction)
        .await
        .map_err(|error| error.to_string())?;
    if already_setup > 0 {
        return Err("Pengaturan awal sudah selesai. Masuk menggunakan akun pemilik.".to_string());
    }

    sqlx::query(
        "INSERT INTO business (id, name, logo_data, address, phone, email, owner_name) VALUES (1, ?, ?, ?, ?, ?, ?)",
    )
    .bind(business_name)
    .bind(form.logo_data)
    .bind(form.address.trim())
    .bind(form.phone.trim())
    .bind(form.email.trim())
    .bind(owner_name)
    .execute(&mut *transaction)
    .await
    .map_err(|error| unique_error(error, "Nama pengguna atau ID pengguna sudah dipakai."))?;
    sqlx::query("INSERT INTO users (username, user_id, full_name, password_hash, role) VALUES (?, ?, ?, ?, 'owner')")
        .bind(username)
        .bind(user_id)
        .bind(owner_name)
        .bind(password_hash)
        .execute(&mut *transaction)
        .await
        .map_err(|error| unique_error(error, "Nama pengguna atau ID pengguna sudah dipakai."))?;
    transaction
        .commit()
        .await
        .map_err(|error| error.to_string())?;
    Ok(json!({ "success": true }))
}

fn unique_error(error: sqlx::Error, message: &str) -> String {
    if matches!(&error, sqlx::Error::Database(database_error) if database_error.is_unique_violation())
    {
        message.to_string()
    } else {
        error.to_string()
    }
}

#[derive(FromRow)]
struct LoginRow {
    id: i64,
    full_name: String,
    username: String,
    role: String,
    password_hash: String,
}

#[tauri::command]
pub async fn login(
    state: State<'_, AppState>,
    identifier: String,
    password: String,
) -> Result<Value, String> {
    let row = sqlx::query_as::<_, LoginRow>(
        "SELECT id, full_name, username, role, password_hash FROM users WHERE username = ? COLLATE NOCASE OR user_id = ? COLLATE NOCASE LIMIT 1",
    )
    .bind(identifier.trim())
    .bind(identifier.trim())
    .fetch_optional(&state.pool)
    .await
    .map_err(|error| error.to_string())?
    .ok_or_else(|| "Username atau ID pengguna tidak ditemukan.".to_string())?;
    let parsed_hash = PasswordHash::new(&row.password_hash).map_err(|error| error.to_string())?;
    Argon2::default()
        .verify_password(password.as_bytes(), &parsed_hash)
        .map_err(|_| "Password salah. Periksa kembali data akun.".to_string())?;
    Ok(json!({
        "success": true,
        "user": { "id": row.id, "fullName": row.full_name, "username": row.username, "role": row.role }
    }))
}

#[tauri::command]
pub async fn get_products(state: State<'_, AppState>, show_images: bool) -> Result<Value, String> {
    let mut products = sqlx::query_as::<_, Product>(
        "SELECT id, name, sku, barcode, category, unit, purchase_price, sale_price, stock, min_stock, image_data, image_attribution, image_source_url, image_license, image_license_url, notes FROM products WHERE is_active = 1 ORDER BY name COLLATE NOCASE",
    )
    .fetch_all(&state.pool)
    .await
    .map_err(|error| error.to_string())?;
    if !show_images {
        for product in &mut products {
            product.image_data.clear();
        }
    }
    Ok(json!({ "success": true, "products": products }))
}

#[tauri::command]
pub async fn save_product(state: State<'_, AppState>, form: ProductForm) -> Result<Value, String> {
    let name = form.name.trim();
    if name.is_empty() {
        return Err("Nama produk wajib diisi.".to_string());
    }
    let purchase_price = parse_nonnegative(&form.purchase_price, "Harga modal")?;
    let sale_price = parse_nonnegative(&form.sale_price, "Harga jual")?;
    let stock = parse_nonnegative(&form.stock, "Stok")?;
    let min_stock = parse_nonnegative(&form.min_stock, "Batas stok menipis")?;
    let next_id: i64 = sqlx::query_scalar("SELECT COALESCE(MAX(id), 0) + 1 FROM products")
        .fetch_one(&state.pool)
        .await
        .map_err(|error| error.to_string())?;
    let sku = if form.sku.trim().is_empty() {
        format!("ALP-{next_id:04}")
    } else {
        form.sku.trim().to_string()
    };
    let barcode = if form.barcode.trim().is_empty() {
        format!("{}", 8_990_000_000_000_i64 + next_id)
    } else {
        form.barcode.trim().to_string()
    };
    let result = sqlx::query(
        "INSERT INTO products (name, sku, barcode, category, unit, purchase_price, sale_price, stock, min_stock, image_data, image_attribution, image_source_url, image_license, image_license_url, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(name)
    .bind(&sku)
    .bind(&barcode)
    .bind(form.category.trim())
    .bind(if form.unit.trim().is_empty() { "pcs" } else { form.unit.trim() })
    .bind(purchase_price)
    .bind(sale_price)
    .bind(stock)
    .bind(min_stock)
    .bind(form.image_data)
    .bind(form.image_attribution.trim())
    .bind(form.image_source_url.trim())
    .bind(form.image_license.trim())
    .bind(form.image_license_url.trim())
    .bind(form.notes.trim())
    .execute(&state.pool)
    .await
    .map_err(|error| unique_error(error, "SKU atau barcode sudah digunakan."))?;
    Ok(json!({ "success": true, "id": result.last_insert_rowid(), "sku": sku, "barcode": barcode }))
}

#[tauri::command]
pub async fn download_image_from_url(image_url: String) -> Result<Value, String> {
    let url = reqwest::Url::parse(image_url.trim())
        .map_err(|_| "Masukkan URL gambar yang valid.".to_string())?;
    if !is_safe_image_url(&url) {
        return Err("Gunakan tautan HTTPS publik ke file gambar (bukan halaman web).".to_string());
    }
    let mut response = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .redirect(reqwest::redirect::Policy::custom(|attempt| {
            if attempt.previous().len() >= 5 || !is_safe_image_url(attempt.url()) {
                attempt.stop()
            } else {
                attempt.follow()
            }
        }))
        .user_agent("NexusPOS/0.1 (product image import)")
        .build()
        .map_err(|error| error.to_string())?
        .get(url)
        .send()
        .await
        .map_err(|error| format!("Gambar tidak dapat diunduh: {error}"))?;
    if !response.status().is_success() {
        return Err(format!(
            "Tautan gambar gagal dibuka (HTTP {}).",
            response.status()
        ));
    }
    if response
        .content_length()
        .is_some_and(|length| length > 5 * 1024 * 1024)
    {
        return Err("Ukuran gambar melebihi batas 5 MB.".to_string());
    }
    let content_type = response
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.split(';').next())
        .unwrap_or("")
        .to_ascii_lowercase();
    let looks_like_image = content_type.starts_with("image/") && content_type != "image/svg+xml"
        || content_type.is_empty()
        || content_type == "application/octet-stream";
    if !looks_like_image {
        return Err("Tautan tersebut bukan file gambar yang didukung.".to_string());
    }
    let max_bytes = 5 * 1024 * 1024;
    let mut bytes =
        Vec::with_capacity(response.content_length().unwrap_or(0).min(max_bytes as u64) as usize);
    while let Some(chunk) = response.chunk().await.map_err(|error| error.to_string())? {
        if bytes.len() + chunk.len() > max_bytes {
            return Err("Ukuran gambar melebihi batas 5 MB.".to_string());
        }
        bytes.extend_from_slice(&chunk);
    }
    if bytes.is_empty() {
        return Err("File gambar kosong.".to_string());
    }
    let image_mime = sniff_image_mime(&bytes)
        .ok_or_else(|| "File bukan JPEG, PNG, WebP, atau GIF yang valid.".to_string())?;
    Ok(
        json!({ "success": true, "imageData": format!("data:{image_mime};base64,{}", BASE64.encode(bytes)) }),
    )
}

fn is_safe_image_url(url: &reqwest::Url) -> bool {
    if url.scheme() != "https"
        || !url.username().is_empty()
        || url.password().is_some()
        || url.port_or_known_default() != Some(443)
    {
        return false;
    }
    let Some(host) = url.host_str() else {
        return false;
    };
    let normalized_host = host.trim_end_matches('.').to_ascii_lowercase();
    if [
        "localhost",
        ".localhost",
        ".local",
        ".internal",
        ".test",
        ".invalid",
    ]
    .iter()
    .any(|suffix| normalized_host == *suffix || normalized_host.ends_with(suffix))
    {
        return false;
    }
    match normalized_host.parse::<IpAddr>() {
        Ok(IpAddr::V4(ip)) => is_safe_ipv4(ip),
        Ok(IpAddr::V6(ip)) => {
            let segments = ip.segments();
            let is_unique_local = segments[0] & 0xfe00 == 0xfc00;
            let is_link_local = segments[0] & 0xffc0 == 0xfe80;
            let mapped_v4_is_private = ip
                .to_ipv4_mapped()
                .is_some_and(|mapped| !is_safe_ipv4(mapped));
            !(ip.is_loopback()
                || ip.is_unspecified()
                || ip.is_multicast()
                || is_unique_local
                || is_link_local
                || mapped_v4_is_private)
        }
        Err(_) => true,
    }
}

fn is_safe_ipv4(ip: std::net::Ipv4Addr) -> bool {
    let octets = ip.octets();
    !(ip.is_private()
        || ip.is_loopback()
        || ip.is_link_local()
        || ip.is_broadcast()
        || ip.is_unspecified()
        || ip.is_multicast()
        || octets[0] == 0
        || (octets[0] == 100 && (64..=127).contains(&octets[1]))
        || (octets[0] == 192 && octets[1] == 0)
        || (octets[0] == 198 && (18..=19).contains(&octets[1]))
        || octets[0] >= 224)
}

fn sniff_image_mime(bytes: &[u8]) -> Option<&'static str> {
    if bytes.starts_with(&[0xff, 0xd8, 0xff]) {
        Some("image/jpeg")
    } else if bytes.starts_with(b"\x89PNG\r\n\x1a\n") {
        Some("image/png")
    } else if bytes.starts_with(b"GIF87a") || bytes.starts_with(b"GIF89a") {
        Some("image/gif")
    } else if bytes.len() >= 12 && &bytes[0..4] == b"RIFF" && &bytes[8..12] == b"WEBP" {
        Some("image/webp")
    } else {
        None
    }
}

#[tauri::command]
pub async fn delete_product(state: State<'_, AppState>, id: i64) -> Result<Value, String> {
    let result = sqlx::query("UPDATE products SET is_active = 0 WHERE id = ? AND is_active = 1")
        .bind(id)
        .execute(&state.pool)
        .await
        .map_err(|error| error.to_string())?;
    if result.rows_affected() == 0 {
        return Err("Produk tidak ditemukan.".to_string());
    }
    Ok(json!({ "success": true }))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaleLineInput {
    product_id: i64,
    quantity: f64,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TransactionInput {
    items: Vec<SaleLineInput>,
    payment_method: String,
    amount_received: f64,
    discount: f64,
    cashier_id: i64,
    cashier_name: String,
    #[serde(default)]
    customer_name: String,
    #[serde(default)]
    customer_phone: String,
    #[serde(default)]
    customer_address: String,
    #[serde(default)]
    customer_note: String,
    #[serde(default)]
    tax_rate: f64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SaleItemResult {
    product_id: i64,
    name: String,
    sku: String,
    unit: String,
    quantity: f64,
    unit_price: f64,
    unit_cost: f64,
    line_total: f64,
}

#[derive(FromRow)]
struct ProductForSale {
    id: i64,
    name: String,
    sku: String,
    unit: String,
    stock: f64,
    sale_price: f64,
    purchase_price: f64,
}

#[tauri::command]
pub async fn create_transaction(
    state: State<'_, AppState>,
    input: TransactionInput,
) -> Result<Value, String> {
    if input.items.is_empty() {
        return Err("Keranjang transaksi kosong.".to_string());
    }
    if !["cash", "qris", "card", "transfer", "ewallet"].contains(&input.payment_method.as_str()) {
        return Err("Metode pembayaran tidak dikenal.".to_string());
    }
    if !input.discount.is_finite()
        || input.discount < 0.0
        || !input.tax_rate.is_finite()
        || !(0.0..=100.0).contains(&input.tax_rate)
    {
        return Err("Diskon atau tarif pajak tidak valid.".to_string());
    }
    let mut transaction = state
        .pool
        .begin()
        .await
        .map_err(|error| error.to_string())?;
    let mut items = Vec::with_capacity(input.items.len());
    for line in &input.items {
        if !line.quantity.is_finite() || line.quantity <= 0.0 {
            return Err("Jumlah produk harus lebih besar dari nol.".to_string());
        }
        let product = sqlx::query_as::<_, ProductForSale>(
            "SELECT id, name, sku, unit, stock, sale_price, purchase_price FROM products WHERE id = ? AND is_active = 1",
        )
        .bind(line.product_id)
        .fetch_optional(&mut *transaction)
        .await
        .map_err(|error| error.to_string())?
        .ok_or_else(|| "Salah satu produk tidak lagi tersedia.".to_string())?;
        if product.stock < line.quantity {
            return Err(format!("Stok {} tidak mencukupi.", product.name));
        }
        items.push((line, product));
    }
    let subtotal: f64 = items
        .iter()
        .map(|(line, product)| line.quantity * product.sale_price)
        .sum();
    if input.discount > subtotal {
        return Err("Diskon tidak boleh melebihi subtotal.".to_string());
    }
    let tax_base = subtotal - input.discount;
    let tax_amount = (tax_base * input.tax_rate / 100.0).round();
    let total = tax_base + tax_amount;
    let amount_received = if input.payment_method == "cash" {
        input.amount_received
    } else {
        total
    };
    if !amount_received.is_finite() || amount_received < total {
        return Err("Nominal uang diterima kurang dari total pembayaran.".to_string());
    }
    let change = if input.payment_method == "cash" {
        amount_received - total
    } else {
        0.0
    };
    let created_at = Utc::now().to_rfc3339();
    let receipt_no = format!(
        "ALP-{}-{}",
        Utc::now().format("%Y%m%d%H%M%S"),
        &Uuid::new_v4().simple().to_string()[..6]
    );
    let cashier_id = (input.cashier_id > 0).then_some(input.cashier_id);
    let result = sqlx::query(
        "INSERT INTO transactions (receipt_no, created_at, payment_method, subtotal, discount, tax_rate, tax_amount, total, amount_received, change_amount, cashier_id, cashier_name, customer_name, customer_phone, customer_address, customer_note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&receipt_no)
    .bind(&created_at)
    .bind(&input.payment_method)
    .bind(subtotal)
    .bind(input.discount)
    .bind(input.tax_rate)
    .bind(tax_amount)
    .bind(total)
    .bind(amount_received)
    .bind(change)
    .bind(cashier_id)
    .bind(if input.cashier_name.trim().is_empty() { "Kasir" } else { input.cashier_name.trim() })
    .bind(input.customer_name.trim())
    .bind(input.customer_phone.trim())
    .bind(input.customer_address.trim())
    .bind(input.customer_note.trim())
    .execute(&mut *transaction)
    .await
    .map_err(|error| error.to_string())?;
    let transaction_id = result.last_insert_rowid();
    let mut receipt_items = Vec::with_capacity(items.len());
    for (line, product) in items {
        let line_total = line.quantity * product.sale_price;
        sqlx::query("INSERT INTO transaction_items (transaction_id, product_id, product_name, sku, quantity, unit_cost, unit_price, line_total) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
            .bind(transaction_id)
            .bind(product.id)
            .bind(&product.name)
            .bind(&product.sku)
            .bind(line.quantity)
            .bind(product.purchase_price)
            .bind(product.sale_price)
            .bind(line_total)
            .execute(&mut *transaction)
            .await
            .map_err(|error| error.to_string())?;
        let stock_result =
            sqlx::query("UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?")
                .bind(line.quantity)
                .bind(product.id)
                .bind(line.quantity)
                .execute(&mut *transaction)
                .await
                .map_err(|error| error.to_string())?;
        if stock_result.rows_affected() == 0 {
            return Err(format!(
                "Stok {} berubah dan tidak mencukupi.",
                product.name
            ));
        }
        receipt_items.push(SaleItemResult {
            product_id: product.id,
            name: product.name,
            sku: product.sku,
            unit: product.unit,
            quantity: line.quantity,
            unit_price: product.sale_price,
            unit_cost: product.purchase_price,
            line_total,
        });
    }
    transaction
        .commit()
        .await
        .map_err(|error| error.to_string())?;
    Ok(json!({
        "success": true,
        "id": transaction_id,
        "receiptNo": receipt_no,
        "createdAt": created_at,
        "items": receipt_items,
        "subtotal": subtotal,
        "discount": input.discount,
        "taxRate": input.tax_rate,
        "taxAmount": tax_amount,
        "total": total,
        "paymentMethod": input.payment_method,
        "amountReceived": amount_received,
        "change": change,
        "customerName": input.customer_name,
        "customerPhone": input.customer_phone,
        "customerAddress": input.customer_address,
        "customerNote": input.customer_note
    }))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExpenseForm {
    category: String,
    #[serde(default)]
    description: String,
    amount: String,
    #[serde(default = "default_payment_method")]
    payment_method: String,
    date: String,
}

fn default_payment_method() -> String {
    "cash".to_string()
}

#[derive(Serialize, FromRow)]
#[serde(rename_all = "camelCase")]
struct Expense {
    id: i64,
    category: String,
    description: String,
    amount: f64,
    #[sqlx(rename = "payment_method")]
    payment_method: String,
    date: String,
}

#[tauri::command]
pub async fn get_expenses(
    state: State<'_, AppState>,
    from_date: String,
    to_date: String,
) -> Result<Value, String> {
    let expenses = sqlx::query_as::<_, Expense>(
        "SELECT id, category, description, amount, payment_method, date FROM expenses WHERE date BETWEEN ? AND ? ORDER BY date DESC, id DESC",
    )
    .bind(&from_date)
    .bind(&to_date)
    .fetch_all(&state.pool)
    .await
    .map_err(|error| error.to_string())?;
    Ok(json!({ "success": true, "expenses": expenses }))
}

#[tauri::command]
pub async fn add_expense(state: State<'_, AppState>, form: ExpenseForm) -> Result<Value, String> {
    let category = form.category.trim();
    if category.is_empty() {
        return Err("Kategori pengeluaran wajib diisi.".to_string());
    }
    let amount = parse_nonnegative(&form.amount, "Nominal")?;
    if amount <= 0.0 {
        return Err("Nominal pengeluaran harus lebih besar dari nol.".to_string());
    }
    if form.date.len() != 10 {
        return Err("Tanggal pengeluaran tidak valid.".to_string());
    }
    let result = sqlx::query("INSERT INTO expenses (category, description, amount, payment_method, date) VALUES (?, ?, ?, ?, ?)")
        .bind(category)
        .bind(form.description.trim())
        .bind(amount)
        .bind(form.payment_method)
        .bind(form.date)
        .execute(&state.pool)
        .await
        .map_err(|error| error.to_string())?;
    Ok(json!({ "success": true, "id": result.last_insert_rowid() }))
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PaymentSummary {
    method: String,
    count: i64,
    total: f64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct FinanceSummary {
    revenue: f64,
    cost: f64,
    expenses: f64,
    gross_profit: f64,
    net_profit: f64,
    transaction_count: i64,
    payments: Vec<PaymentSummary>,
}

#[derive(FromRow)]
struct SummaryTotals {
    revenue: f64,
    cost: f64,
    expenses: f64,
    transaction_count: i64,
}

async fn finance_summary(
    pool: &SqlitePool,
    from: &str,
    to: &str,
) -> Result<FinanceSummary, String> {
    let totals = sqlx::query_as::<_, SummaryTotals>(
        "SELECT
            CAST(COALESCE((SELECT SUM(total - tax_amount) FROM transactions WHERE date(created_at) BETWEEN ? AND ?), 0.0) AS REAL) AS revenue,
            CAST(COALESCE((SELECT SUM(i.unit_cost * i.quantity) FROM transaction_items i JOIN transactions t ON t.id = i.transaction_id WHERE date(t.created_at) BETWEEN ? AND ?), 0.0) AS REAL) AS cost,
            CAST(COALESCE((SELECT SUM(amount) FROM expenses WHERE date BETWEEN ? AND ?), 0.0) AS REAL) AS expenses,
            (SELECT COUNT(*) FROM transactions WHERE date(created_at) BETWEEN ? AND ?) AS transaction_count",
    )
    .bind(from).bind(to)
    .bind(from).bind(to)
    .bind(from).bind(to)
    .bind(from).bind(to)
    .fetch_one(pool)
    .await
    .map_err(|error| error.to_string())?;
    let payments = sqlx::query_as::<_, (String, i64, f64)>(
        "SELECT payment_method, COUNT(*), COALESCE(SUM(total), 0) FROM transactions WHERE date(created_at) BETWEEN ? AND ? GROUP BY payment_method ORDER BY payment_method",
    )
    .bind(from)
    .bind(to)
    .fetch_all(pool)
    .await
    .map_err(|error| error.to_string())?
    .into_iter()
    .map(|(method, count, total)| PaymentSummary { method, count, total })
    .collect();
    let gross_profit = totals.revenue - totals.cost;
    Ok(FinanceSummary {
        revenue: totals.revenue,
        cost: totals.cost,
        expenses: totals.expenses,
        gross_profit,
        net_profit: gross_profit - totals.expenses,
        transaction_count: totals.transaction_count,
        payments,
    })
}

fn normalize_date_range<'a>(from: &'a str, to: &'a str) -> (&'a str, &'a str) {
    let from = if from.is_empty() { "0001-01-01" } else { from };
    let to = if to.is_empty() { "9999-12-31" } else { to };
    (from, to)
}

#[tauri::command]
pub async fn get_finance_summary(
    state: State<'_, AppState>,
    from_date: String,
    to_date: String,
) -> Result<Value, String> {
    let (from, to) = normalize_date_range(&from_date, &to_date);
    let summary = finance_summary(&state.pool, from, to).await?;
    let mut value = serde_json::to_value(summary).map_err(|error| error.to_string())?;
    value["success"] = json!(true);
    Ok(value)
}

#[derive(Serialize, FromRow)]
#[serde(rename_all = "camelCase")]
struct SaleSummary {
    id: i64,
    #[sqlx(rename = "receipt_no")]
    receipt_no: String,
    #[sqlx(rename = "created_at")]
    created_at: String,
    #[sqlx(rename = "payment_method")]
    payment_method: String,
    total: f64,
    #[sqlx(rename = "cashier_name")]
    cashier_name: String,
}

#[derive(Serialize, FromRow)]
#[serde(rename_all = "camelCase")]
struct DailySale {
    date: String,
    total: f64,
}

#[derive(Serialize, FromRow)]
struct TopProduct {
    name: String,
    quantity: f64,
    revenue: f64,
    profit: f64,
}

#[tauri::command]
pub async fn get_report_data(
    state: State<'_, AppState>,
    from_date: String,
    to_date: String,
) -> Result<Value, String> {
    let (from, to) = normalize_date_range(&from_date, &to_date);
    let summary = finance_summary(&state.pool, from, to).await?;
    let daily_sales = sqlx::query_as::<_, DailySale>(
        "SELECT date(created_at) AS date, COALESCE(SUM(total - tax_amount), 0) AS total FROM transactions WHERE date(created_at) BETWEEN ? AND ? GROUP BY date(created_at) ORDER BY date(created_at)",
    )
    .bind(from)
    .bind(to)
    .fetch_all(&state.pool)
    .await
    .map_err(|error| error.to_string())?;
    let recent_sales = sqlx::query_as::<_, SaleSummary>(
        "SELECT id, receipt_no, created_at, payment_method, total, cashier_name FROM transactions WHERE date(created_at) BETWEEN ? AND ? ORDER BY created_at DESC, id DESC LIMIT 20",
    )
    .bind(from)
    .bind(to)
    .fetch_all(&state.pool)
    .await
    .map_err(|error| error.to_string())?;
    let top_products = sqlx::query_as::<_, TopProduct>(
        "SELECT i.product_name AS name, SUM(i.quantity) AS quantity, SUM(i.line_total) AS revenue, SUM((i.unit_price - i.unit_cost) * i.quantity) AS profit
         FROM transaction_items i JOIN transactions t ON t.id = i.transaction_id
         WHERE date(t.created_at) BETWEEN ? AND ? GROUP BY i.product_name ORDER BY revenue DESC LIMIT 10",
    )
    .bind(from)
    .bind(to)
    .fetch_all(&state.pool)
    .await
    .map_err(|error| error.to_string())?;
    Ok(
        json!({ "success": true, "summary": summary, "dailySales": daily_sales, "recentSales": recent_sales, "topProducts": top_products }),
    )
}

#[derive(Serialize, FromRow)]
#[serde(rename_all = "camelCase")]
struct ExportSale {
    #[sqlx(rename = "receipt_no")]
    receipt_no: String,
    #[sqlx(rename = "created_at")]
    created_at: String,
    #[sqlx(rename = "cashier_name")]
    cashier_name: String,
    #[sqlx(rename = "payment_method")]
    payment_method: String,
    subtotal: f64,
    discount: f64,
    #[sqlx(rename = "tax_rate")]
    tax_rate: f64,
    #[sqlx(rename = "tax_amount")]
    tax_amount: f64,
    total: f64,
    #[sqlx(rename = "amount_received")]
    amount_received: f64,
    #[sqlx(rename = "change_amount")]
    change: f64,
    #[sqlx(rename = "customer_name")]
    customer_name: String,
    #[sqlx(rename = "customer_phone")]
    customer_phone: String,
    #[sqlx(rename = "customer_address")]
    customer_address: String,
    #[sqlx(rename = "customer_note")]
    customer_note: String,
}

#[derive(Serialize, FromRow)]
#[serde(rename_all = "camelCase")]
struct ExportItem {
    #[sqlx(rename = "receipt_no")]
    receipt_no: String,
    #[sqlx(rename = "product_name")]
    product_name: String,
    sku: String,
    unit: String,
    quantity: f64,
    #[sqlx(rename = "unit_cost")]
    unit_cost: f64,
    #[sqlx(rename = "unit_price")]
    unit_price: f64,
    #[sqlx(rename = "line_total")]
    net_line_total: f64,
}

#[tauri::command]
pub async fn get_report_export_data(
    state: State<'_, AppState>,
    from_date: String,
    to_date: String,
) -> Result<Value, String> {
    let (from, to) = normalize_date_range(&from_date, &to_date);
    let sales = sqlx::query_as::<_, ExportSale>(
        "SELECT receipt_no, created_at, cashier_name, payment_method, subtotal, discount, tax_rate, tax_amount, total, amount_received, change_amount, customer_name, customer_phone, customer_address, customer_note FROM transactions WHERE date(created_at) BETWEEN ? AND ? ORDER BY created_at",
    )
    .bind(from)
    .bind(to)
    .fetch_all(&state.pool)
    .await
    .map_err(|error| error.to_string())?;
    let items = sqlx::query_as::<_, ExportItem>(
        "SELECT t.receipt_no, i.product_name, i.sku, COALESCE(p.unit, 'pcs') AS unit, i.quantity, i.unit_cost, i.unit_price, i.line_total FROM transaction_items i JOIN transactions t ON t.id = i.transaction_id LEFT JOIN products p ON p.id = i.product_id WHERE date(t.created_at) BETWEEN ? AND ? ORDER BY t.created_at, i.id",
    )
    .bind(from)
    .bind(to)
    .fetch_all(&state.pool)
    .await
    .map_err(|error| error.to_string())?;
    let expenses = sqlx::query_as::<_, Expense>(
        "SELECT id, category, description, amount, payment_method, date FROM expenses WHERE date BETWEEN ? AND ? ORDER BY date",
    )
    .bind(from)
    .bind(to)
    .fetch_all(&state.pool)
    .await
    .map_err(|error| error.to_string())?;
    Ok(json!({ "success": true, "sales": sales, "items": items, "expenses": expenses }))
}

#[tauri::command]
pub async fn get_scanner_info(state: State<'_, AppState>) -> Result<Value, String> {
    let token: String =
        sqlx::query_scalar("SELECT value FROM settings WHERE key = 'scanner_token'")
            .fetch_optional(&state.pool)
            .await
            .map_err(|error| error.to_string())?
            .filter(|value: &String| !value.is_empty())
            .unwrap_or_else(|| Uuid::new_v4().to_string());
    sqlx::query("INSERT INTO settings (key, value) VALUES ('scanner_token', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
        .bind(&token)
        .execute(&state.pool)
        .await
        .map_err(|error| error.to_string())?;
    Ok(
        json!({ "success": true, "listening": false, "addresses": [], "port": 8765, "token": token }),
    )
}

#[tauri::command]
pub async fn save_settings(
    state: State<'_, AppState>,
    show_product_images: Option<bool>,
    scanner_mode: Option<String>,
) -> Result<Value, String> {
    if let Some(show_product_images) = show_product_images {
        upsert_setting(
            &state.pool,
            "show_product_images",
            if show_product_images { "true" } else { "false" },
        )
        .await?;
    }
    if let Some(scanner_mode) = scanner_mode {
        if scanner_mode != "hid" && scanner_mode != "wifi" {
            return Err("Mode scanner tidak dikenal.".to_string());
        }
        upsert_setting(&state.pool, "scanner_mode", &scanner_mode).await?;
    }
    Ok(json!({ "success": true }))
}

async fn upsert_setting(pool: &SqlitePool, key: &str, value: &str) -> Result<(), String> {
    sqlx::query("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
        .bind(key)
        .bind(value)
        .execute(pool)
        .await
        .map_err(|error| error.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn rotate_scanner_token(state: State<'_, AppState>) -> Result<Value, String> {
    let token = Uuid::new_v4().to_string();
    upsert_setting(&state.pool, "scanner_token", &token).await?;
    Ok(
        json!({ "success": true, "listening": false, "addresses": [], "port": 8765, "token": token }),
    )
}

#[tauri::command]
pub async fn set_scanner_active(state: State<'_, AppState>, active: bool) -> Result<Value, String> {
    let mut scanner_active = state
        .scanner_active
        .lock()
        .map_err(|error| error.to_string())?;
    *scanner_active = active;
    Ok(json!({ "success": true, "active": active }))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn initial_migration_creates_pos_schema() {
        tauri::async_runtime::block_on(async {
            let pool = SqlitePoolOptions::new()
                .max_connections(1)
                .connect("sqlite::memory:")
                .await
                .expect("in-memory SQLite should start");
            sqlx::migrate!("./migrations")
                .run(&pool)
                .await
                .expect("POS migration should apply");

            let table_count: i64 = sqlx::query_scalar(
                "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name IN ('business', 'users', 'products', 'transactions', 'transaction_items', 'expenses', 'settings')",
            )
            .fetch_one(&pool)
            .await
            .expect("schema query should succeed");
            assert_eq!(table_count, 7);

            let empty_summary = finance_summary(&pool, "2026-01-01", "2026-01-31")
                .await
                .expect("empty finance summary should decode as numeric zeros");
            assert_eq!(empty_summary.revenue, 0.0);
            assert_eq!(empty_summary.cost, 0.0);
            assert_eq!(empty_summary.expenses, 0.0);
            assert_eq!(empty_summary.transaction_count, 0);
        });
    }

    #[test]
    fn image_import_only_accepts_public_https_urls() {
        let public = reqwest::Url::parse("https://images.example.org/item.jpg").unwrap();
        let private = reqwest::Url::parse("https://192.168.1.20/item.jpg").unwrap();
        let local = reqwest::Url::parse("https://localhost/item.jpg").unwrap();
        let insecure = reqwest::Url::parse("http://images.example.org/item.jpg").unwrap();
        assert!(is_safe_image_url(&public));
        assert!(!is_safe_image_url(&private));
        assert!(!is_safe_image_url(&local));
        assert!(!is_safe_image_url(&insecure));
    }

    #[test]
    fn image_import_checks_file_signatures() {
        assert_eq!(
            sniff_image_mime(&[0xff, 0xd8, 0xff, 0x00]),
            Some("image/jpeg")
        );
        assert_eq!(sniff_image_mime(b"GIF89a"), Some("image/gif"));
        assert_eq!(sniff_image_mime(b"not an image"), None);
    }
}
