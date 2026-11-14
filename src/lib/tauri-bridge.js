import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

function call(command, args, callback) {
    invoke(command, args)
        .then((result) => callback?.(result))
        .catch((error) => callback?.({ success: false, error: String(error) }));
}

function createBarcodeSignal() {
    const subscriptions = new Map();
    return {
        connect(handler) {
            const subscription = { cancelled: false, unlisten: null };
            subscriptions.set(handler, subscription);
            listen("barcode-scanned", (event) => handler(event.payload))
                .then((unlisten) => {
                    subscription.unlisten = unlisten;
                    if (subscription.cancelled) unlisten();
                })
                .catch(() => {});
        },
        disconnect(handler) {
            const subscription = subscriptions.get(handler);
            if (!subscription) return;
            subscription.cancelled = true;
            subscription.unlisten?.();
            subscriptions.delete(handler);
        },
    };
}

export function createTauriBridge() {
    return {
        barcodeScanned: createBarcodeSignal(),
        initialize(callback) {
            call("initialize", {}, callback);
        },
        getSettings(callback) {
            call("get_settings", {}, callback);
        },
        saveBusiness(form, callback) {
            call("save_business", { form }, callback);
        },
        login(identifier, password, callback) {
            call("login", { identifier, password }, callback);
        },
        getProducts(showImages, callback) {
            call("get_products", { showImages }, callback);
        },
        saveProduct(form, callback) {
            call("save_product", { form }, callback);
        },
        downloadImageFromUrl(imageUrl, callback) {
            call("download_image_from_url", { imageUrl }, callback);
        },
        deleteProduct(id, callback) {
            call("delete_product", { id }, callback);
        },
        createTransaction(input, callback) {
            call("create_transaction", { input }, callback);
        },
        getExpenses(fromDate, toDate, callback) {
            call("get_expenses", { fromDate, toDate }, callback);
        },
        addExpense(form, callback) {
            call("add_expense", { form }, callback);
        },
        getFinanceSummary(fromDate, toDate, callback) {
            call("get_finance_summary", { fromDate, toDate }, callback);
        },
        getReportData(fromDate, toDate, callback) {
            call("get_report_data", { fromDate, toDate }, callback);
        },
        getReportExportData(fromDate, toDate, callback) {
            call("get_report_export_data", { fromDate, toDate }, callback);
        },
        getScannerInfo(callback) {
            call("get_scanner_info", {}, callback);
        },
        saveSettings(settings, callback) {
            call("save_settings", settings, callback);
        },
        rotateScannerToken(callback) {
            call("rotate_scanner_token", {}, callback);
        },
        setScannerActive(active, callback) {
            call("set_scanner_active", { active }, callback);
        },
    };
}
