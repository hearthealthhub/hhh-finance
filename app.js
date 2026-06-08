const storeKey = "familyFinanceDashboard.v1";

const today = new Date().toISOString().slice(0, 10);

const seed = {
  settings: {
    businessName: "Heart Health Hub",
    currency: "â‚¦",
    bufferPercent: 20,
    tagline: "Thank you for your order."
  },
  supabase: {
    enabled: false,
    url: "https://shtqiwmwplinwnktmysi.supabase.co",
    anonKey: ""
  },
  auth: {
    accessToken: "",
    refreshToken: "",
    email: ""
  },
  customers: [
    { id: crypto.randomUUID(), name: "Amina Bello", contact: "WhatsApp" },
    { id: crypto.randomUUID(), name: "Chinedu Okafor", contact: "Phone" }
  ],
  products: [
    { id: crypto.randomUUID(), name: "Aloe Vera Gel", sku: "FL-001", cost: 9500, price: 14500 },
    { id: crypto.randomUUID(), name: "Forever Bright Toothgel", sku: "FL-002", cost: 4200, price: 6500 },
    { id: crypto.randomUUID(), name: "Bee Honey", sku: "FL-003", cost: 8200, price: 12000 }
  ],
  orders: [],
  expenses: [],
  assets: [],
  liabilities: []
};

let state = loadState();
let activeInvoiceOrder = null;
let isRemoteLoading = false;
let syncMessage = "";

function loadState() {
  const raw = localStorage.getItem(storeKey);
  const loaded = raw ? { ...structuredClone(seed), ...JSON.parse(raw) } : structuredClone(seed);
  loaded.supabase = { ...seed.supabase, ...(loaded.supabase || {}) };
  loaded.customers = loaded.customers.map((customer) => ({ id: customer.id || crypto.randomUUID(), ...customer }));
  return loaded;
}

function saveState() {
  localStorage.setItem(storeKey, JSON.stringify(state));
  renderAll();
  if (isSupabaseReady() && isSignedIn() && !isRemoteLoading) {
    syncAllToSupabase().catch((error) => setSyncStatus(`Sync failed: ${error.message}`, false));
  }
}

function isSupabaseReady() {
  return Boolean(state.supabase?.enabled && state.supabase.url && state.supabase.anonKey);
}

function isSignedIn() {
  return Boolean(state.auth?.accessToken && state.auth?.email);
}

function setSyncStatus(message, online = false, detail = "") {
  syncMessage = detail || message;
  const el = document.querySelector("#syncStatus");
  if (!el) return;
  el.textContent = message;
  el.classList.toggle("online", online);
  el.classList.toggle("offline", !online);
  const detailEl = document.querySelector("#syncDetail");
  if (detailEl) detailEl.textContent = syncMessage;
}

async function supabaseFetch(path, options = {}) {
  const baseUrl = state.supabase.url.replace(/\/$/, "");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${baseUrl}/rest/v1/${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        apikey: state.supabase.anonKey,
        Authorization: `Bearer ${state.auth?.accessToken || state.supabase.anonKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
        ...(options.headers || {})
      }
    });
    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || response.statusText);
    }
    if (response.status === 204) return null;
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Supabase request timed out. Check the project URL, anon key, or internet connection.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function supabaseAuth(path, body) {
  const baseUrl = state.supabase.url.replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/auth/v1/${path}`, {
    method: "POST",
    headers: {
      apikey: state.supabase.anonKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) throw new Error(data.msg || data.error_description || data.message || response.statusText);
  return data;
}

function setAuthMessage(message) {
  const el = document.querySelector("#authMessage");
  if (el) el.textContent = message;
}

function renderAuth() {
  const authScreen = document.querySelector("#authScreen");
  const needsAuth = isSupabaseReady() && !isSignedIn();
  authScreen.classList.toggle("hidden", !needsAuth);
  document.querySelector("#accountStatus").textContent = isSignedIn() ? state.auth.email : "Not signed in";
  document.querySelector("#accountDetail").textContent = isSignedIn()
    ? "You are signed in and can use shared Supabase records."
    : isSupabaseReady()
      ? "Sign in to load and save shared Supabase records."
      : "Connect Supabase, then sign in to use shared data.";
  document.querySelector("#accountBtn").textContent = isSignedIn() ? state.auth.email.split("@")[0] : "Account";
}

function toRemote(table, record) {
  if (table === "business_settings") {
    return {
      id: "singleton",
      business_name: state.settings.businessName,
      currency: state.settings.currency,
      buffer_percent: state.settings.bufferPercent,
      tagline: state.settings.tagline
    };
  }
  if (table === "customers") return { id: record.id, name: record.name, contact: record.contact };
  if (table === "products") return record;
  if (table === "orders") {
    return {
      id: record.id,
      created_at: record.createdAt,
      order_number: record.orderNumber,
      customer_name: record.customerName,
      customer_contact: record.customerContact,
      order_date: record.date,
      discount_type: record.discountType,
      discount_value: record.discountValue,
      delivery_fee: record.deliveryFee,
      delivery_cost: record.deliveryCost,
      payment_status: record.paymentStatus,
      notes: record.notes,
      items: record.items
    };
  }
  if (table === "expenses") {
    return {
      id: record.id,
      category: record.category,
      amount: record.amount,
      date: record.date,
      paid_by: record.paidBy,
      notes: record.notes
    };
  }
  if (table === "assets") {
    return {
      id: record.id,
      name: record.name,
      amount: record.amount,
      current_value: record.currentValue,
      asset_date: record.date
    };
  }
  if (table === "liabilities") {
    return {
      id: record.id,
      name: record.name,
      amount: record.amount,
      due_date: record.dueDate,
      status: record.status
    };
  }
  return record;
}

function fromRemote(table, record) {
  if (table === "business_settings") {
    return {
      businessName: record.business_name,
      currency: record.currency,
      bufferPercent: record.buffer_percent,
      tagline: record.tagline
    };
  }
  if (table === "customers") return { id: record.id, name: record.name, contact: record.contact };
  if (table === "products") return record;
  if (table === "orders") {
    return {
      id: record.id,
      createdAt: record.created_at,
      orderNumber: record.order_number,
      customerName: record.customer_name,
      customerContact: record.customer_contact,
      date: record.order_date,
      discountType: record.discount_type,
      discountValue: record.discount_value,
      deliveryFee: record.delivery_fee,
      deliveryCost: record.delivery_cost,
      paymentStatus: record.payment_status,
      notes: record.notes,
      items: record.items || []
    };
  }
  if (table === "expenses") {
    return {
      id: record.id,
      category: record.category,
      amount: record.amount,
      date: record.date,
      paidBy: record.paid_by,
      notes: record.notes
    };
  }
  if (table === "assets") {
    return {
      id: record.id,
      name: record.name,
      amount: record.amount,
      currentValue: record.current_value,
      date: record.asset_date
    };
  }
  if (table === "liabilities") {
    return {
      id: record.id,
      name: record.name,
      amount: record.amount,
      dueDate: record.due_date,
      status: record.status
    };
  }
  return record;
}

async function replaceRemoteTable(table, records) {
  await supabaseFetch(`${table}?id=not.is.null`, { method: "DELETE" });
  if (records.length) {
    await supabaseFetch(table, {
      method: "POST",
      body: JSON.stringify(records.map((record) => toRemote(table, record)))
    });
  }
}

async function syncAllToSupabase() {
  setSyncStatus("Syncing...", false, "Saving business settings...");
  await supabaseFetch("business_settings", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(toRemote("business_settings"))
  });
  setSyncStatus("Syncing...", false, "Saving customers...");
  await replaceRemoteTable("customers", state.customers);
  setSyncStatus("Syncing...", false, "Saving products...");
  await replaceRemoteTable("products", state.products);
  setSyncStatus("Syncing...", false, "Saving orders...");
  await replaceRemoteTable("orders", state.orders);
  setSyncStatus("Syncing...", false, "Saving expenses...");
  await replaceRemoteTable("expenses", state.expenses);
  setSyncStatus("Syncing...", false, "Saving assets...");
  await replaceRemoteTable("assets", state.assets);
  setSyncStatus("Syncing...", false, "Saving liabilities...");
  await replaceRemoteTable("liabilities", state.liabilities);
  setSyncStatus("Synced", true, "Supabase is connected and your records are shared.");
}

async function loadFromSupabase(options = {}) {
  if (!isSupabaseReady()) {
    setSyncStatus("Local only", false);
    return false;
  }
  if (!isSignedIn()) {
    setSyncStatus("Sign in needed", false, "Sign in before loading shared Supabase records.");
    renderAuth();
    return false;
  }
  isRemoteLoading = true;
  setSyncStatus("Loading sync...", false, "Checking Supabase tables...");
  try {
    const [settingsRows, customers, products, orders, expenses, assets, liabilities] = await Promise.all([
      supabaseFetch("business_settings?id=eq.singleton&select=*"),
      supabaseFetch("customers?select=*"),
      supabaseFetch("products?select=*"),
      supabaseFetch("orders?select=*"),
      supabaseFetch("expenses?select=*"),
      supabaseFetch("assets?select=*"),
      supabaseFetch("liabilities?select=*")
    ]);
    const hasRemoteData = [customers, products, orders, expenses, assets, liabilities].some((rows) => rows.length > 0);
    if (settingsRows?.[0]) state.settings = fromRemote("business_settings", settingsRows[0]);
    if (!hasRemoteData) {
      const hasLocalData = [state.customers, state.products, state.orders, state.expenses, state.assets, state.liabilities].some((rows) => rows.length > 0);
      if (!hasLocalData) {
        const freshSeed = structuredClone(seed);
        state.customers = freshSeed.customers;
        state.products = freshSeed.products;
      }
      localStorage.setItem(storeKey, JSON.stringify(state));
      renderAll();
      setSyncStatus("Ready to upload", false, "Supabase is empty, so this device will upload its current records.");
      return false;
    }
    state.customers = customers.map((row) => fromRemote("customers", row));
    state.products = products.map((row) => fromRemote("products", row));
    state.orders = orders.map((row) => fromRemote("orders", row));
    state.expenses = expenses.map((row) => fromRemote("expenses", row));
    state.assets = assets.map((row) => fromRemote("assets", row));
    state.liabilities = liabilities.map((row) => fromRemote("liabilities", row));
    localStorage.setItem(storeKey, JSON.stringify(state));
    renderAll();
    setSyncStatus("Synced", true, "Loaded shared records from Supabase.");
    return true;
  } catch (error) {
    setSyncStatus("Sync failed", false, error.message);
    toast("Supabase sync failed. See Settings.");
    console.error(error);
    return false;
  } finally {
    isRemoteLoading = false;
  }
}

function money(value) {
  return `${state.settings.currency}${Number(value || 0).toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
}

function asNumber(value) {
  return Number(value || 0);
}

function getMonthKey(dateString) {
  return (dateString || today).slice(0, 7);
}

function thisMonth() {
  return today.slice(0, 7);
}

function monthName(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en", { month: "short" });
}

function calculateOrder(order) {
  const subtotal = order.items.reduce((sum, item) => sum + item.qty * item.price, 0);
  const cost = order.items.reduce((sum, item) => sum + item.qty * item.cost, 0);
  const discount = order.discountType === "percent" ? subtotal * (asNumber(order.discountValue) / 100) : asNumber(order.discountValue);
  const total = Math.max(0, subtotal - discount + asNumber(order.deliveryFee));
  const profit = total - cost - asNumber(order.deliveryCost);
  return { subtotal, cost, discount, total, profit };
}

function generateOrderNumber(dateString) {
  const now = new Date();
  const compactDate = dateString.replaceAll("-", "");
  const time = `${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
  const orderOfDay = state.orders.filter((order) => order.date === dateString).length + 1;
  return `${compactDate}-${time}-${orderOfDay}`;
}

function toast(message) {
  const el = document.querySelector("#toast");
  el.textContent = message;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2200);
}

function setView(view) {
  document.querySelectorAll(".view").forEach((el) => el.classList.remove("active"));
  document.querySelector(`#${view}View`).classList.add("active");
  document.querySelectorAll(".nav-item").forEach((el) => el.classList.toggle("active", el.dataset.view === view));
  document.querySelector("#pageTitle").textContent = document.querySelector(`[data-view="${view}"]`).textContent;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function addItemRow(item = {}) {
  const row = document.createElement("div");
  row.className = "item-row";
  row.innerHTML = `
    <label>Product
      <input list="productListOptions" class="item-product" value="${item.name || ""}" required placeholder="Choose product" />
    </label>
    <label>Qty
      <input type="number" class="item-qty" min="1" value="${item.qty || 1}" required />
    </label>
    <label>Price
      <input type="number" class="item-price" min="0" step="100" value="${item.price || 0}" required />
    </label>
    <label>Cost
      <input type="number" class="item-cost" min="0" step="100" value="${item.cost || 0}" required />
    </label>
    <button class="icon-btn" type="button" title="Remove item">Ã—</button>
  `;
  row.querySelector(".item-product").addEventListener("change", (event) => {
    const product = state.products.find((p) => p.name === event.target.value);
    if (!product) return;
    row.querySelector(".item-price").value = product.price;
    row.querySelector(".item-cost").value = product.cost;
    updateOrderPreview();
  });
  row.querySelectorAll("input").forEach((input) => input.addEventListener("input", updateOrderPreview));
  row.querySelector(".icon-btn").addEventListener("click", () => {
    if (document.querySelectorAll(".item-row").length > 1) row.remove();
    updateOrderPreview();
  });
  document.querySelector("#itemsContainer").append(row);
  updateOrderPreview();
}

function setOrderExtractStatus(message) {
  document.querySelector("#orderExtractStatus").textContent = message;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function fillOrderDraft(draft) {
  if (draft.customerName) document.querySelector("#customerName").value = draft.customerName;
  if (draft.customerContact) document.querySelector("#customerContact").value = draft.customerContact;
  if (draft.orderDate && /^\d{4}-\d{2}-\d{2}$/.test(draft.orderDate)) document.querySelector("#orderDate").value = draft.orderDate;
  if (draft.discountType) document.querySelector("#discountType").value = draft.discountType;
  if (draft.discountValue !== null && draft.discountValue !== undefined) document.querySelector("#discountValue").value = draft.discountValue;
  if (draft.deliveryFee !== null && draft.deliveryFee !== undefined) document.querySelector("#deliveryFee").value = draft.deliveryFee;
  if (draft.deliveryCost !== null && draft.deliveryCost !== undefined) document.querySelector("#deliveryCost").value = draft.deliveryCost;
  if (draft.paymentStatus) document.querySelector("#paymentStatus").value = draft.paymentStatus;
  if (draft.notes) document.querySelector("#orderNotes").value = draft.notes;

  if (Array.isArray(draft.items) && draft.items.length) {
    document.querySelector("#itemsContainer").innerHTML = "";
    draft.items.forEach((item) => {
      const matchedProduct = state.products.find((product) => product.name.toLowerCase() === String(item.name || "").toLowerCase());
      addItemRow({
        name: matchedProduct?.name || item.name || "",
        qty: item.qty || 1,
        price: item.price ?? matchedProduct?.price ?? 0,
        cost: item.cost ?? matchedProduct?.cost ?? 0
      });
    });
  }

  updateOrderPreview();
}

function getDraftItems() {
  return [...document.querySelectorAll(".item-row")].map((row) => ({
    name: row.querySelector(".item-product").value,
    qty: asNumber(row.querySelector(".item-qty").value),
    price: asNumber(row.querySelector(".item-price").value),
    cost: asNumber(row.querySelector(".item-cost").value)
  }));
}

function updateOrderPreview() {
  const draft = {
    items: getDraftItems(),
    discountType: document.querySelector("#discountType").value,
    discountValue: asNumber(document.querySelector("#discountValue").value),
    deliveryFee: asNumber(document.querySelector("#deliveryFee").value),
    deliveryCost: asNumber(document.querySelector("#deliveryCost").value)
  };
  const totals = calculateOrder(draft);
  document.querySelector("#orderSubtotal").textContent = money(totals.subtotal);
  document.querySelector("#orderDiscount").textContent = money(totals.discount);
  document.querySelector("#orderTotal").textContent = money(totals.total);
  document.querySelector("#orderProfit").textContent = money(totals.profit);
  document.querySelector("#nextOrderNumber").textContent = generateOrderNumber(document.querySelector("#orderDate").value || today);
}

function renderDashboard() {
  const month = thisMonth();
  const orders = state.orders.filter((order) => getMonthKey(order.date) === month);
  const expenses = state.expenses.filter((expense) => getMonthKey(expense.date) === month);
  const revenue = orders.reduce((sum, order) => sum + calculateOrder(order).total, 0);
  const orderProfit = orders.reduce((sum, order) => sum + calculateOrder(order).profit, 0);
  const expenseTotal = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const netProfit = orderProfit - expenseTotal;
  const openLiabilities = state.liabilities.filter((item) => item.status === "open").reduce((sum, item) => sum + item.amount, 0);
  const assets = state.assets.reduce((sum, item) => sum + asNumber(item.currentValue || item.amount), 0);
  const buffer = Math.max(0, netProfit * (asNumber(state.settings.bufferPercent) / 100));
  const spendable = Math.max(0, netProfit - openLiabilities - buffer);

  document.querySelector("#netProfit").textContent = money(netProfit);
  document.querySelector("#monthlyRevenue").textContent = money(revenue);
  document.querySelector("#monthlyExpenses").textContent = money(expenseTotal);
  document.querySelector("#monthlyOrders").textContent = `${orders.length} orders`;
  document.querySelector("#expenseCount").textContent = `${expenses.length} entries`;
  document.querySelector("#profitMargin").textContent = `${revenue ? Math.round((netProfit / revenue) * 100) : 0}% margin`;
  document.querySelector("#spendableCash").textContent = money(spendable);
  document.querySelector("#bufferText").textContent = `After ${state.settings.bufferPercent}% savings buffer`;
  document.querySelector("#totalAssets").textContent = money(assets);
  document.querySelector("#openLiabilities").textContent = money(openLiabilities);
  document.querySelector("#netWorth").textContent = money(assets - openLiabilities);
  document.querySelector("#avgOrderValue").textContent = money(orders.length ? revenue / orders.length : 0);

  renderTrend();
  renderActivity();
}

function renderTrend() {
  const months = [2, 1, 0].map((back) => {
    const date = new Date();
    date.setMonth(date.getMonth() - back);
    return date.toISOString().slice(0, 7);
  });
  const stats = months.map((month) => {
    const orders = state.orders.filter((order) => getMonthKey(order.date) === month);
    const expenses = state.expenses.filter((expense) => getMonthKey(expense.date) === month);
    const revenue = orders.reduce((sum, order) => sum + calculateOrder(order).total, 0);
    const orderProfit = orders.reduce((sum, order) => sum + calculateOrder(order).profit, 0);
    const expenseTotal = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    return { month, revenue, expenses: expenseTotal, profit: orderProfit - expenseTotal };
  });
  const max = Math.max(1, ...stats.flatMap((item) => [item.revenue, item.expenses, Math.max(0, item.profit)]));
  document.querySelector("#trendChart").innerHTML = stats
    .map(
      (item) => `
        <div class="trend-month">
          <div class="bars" title="${money(item.revenue)} revenue, ${money(item.expenses)} expenses, ${money(item.profit)} profit">
            <div class="bar revenue" style="height:${Math.max(4, (item.revenue / max) * 190)}px"></div>
            <div class="bar expenses" style="height:${Math.max(4, (item.expenses / max) * 190)}px"></div>
            <div class="bar profit" style="height:${Math.max(4, (Math.max(0, item.profit) / max) * 190)}px"></div>
          </div>
          <label>${monthName(item.month)}</label>
        </div>`
    )
    .join("");
}

function renderActivity() {
  const activity = [
    ...state.orders.map((order) => ({ type: "Order", date: order.date, title: order.customerName, amount: calculateOrder(order).total })),
    ...state.expenses.map((expense) => ({ type: "Expense", date: expense.date, title: expense.category, amount: -expense.amount }))
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 8);
  document.querySelector("#activityList").innerHTML = activity.length
    ? activity.map((item) => `<div class="activity-item"><div><strong>${item.title}</strong><small>${item.type} â€¢ ${item.date}</small></div><strong>${money(item.amount)}</strong></div>`).join("")
    : `<div class="activity-item"><div><strong>No activity yet</strong><small>Your newest orders and expenses will appear here.</small></div></div>`;
}

function renderOrders() {
  document.querySelector("#orderCountLabel").textContent = `${state.orders.length} saved`;
  document.querySelector("#ordersTable").innerHTML = state.orders
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((order) => {
      const totals = calculateOrder(order);
      return `<tr>
        <td><strong>${order.orderNumber}</strong><small>${order.date}</small></td>
        <td>${order.customerName}<small>${order.paymentStatus}</small></td>
        <td>${money(totals.total)}</td>
        <td>${money(totals.profit)}</td>
        <td><div class="table-actions"><button class="ghost-btn small" data-invoice="${order.id}">Invoice</button><button class="ghost-btn small" data-delete-order="${order.id}">Delete</button></div></td>
      </tr>`;
    })
    .join("");
}

function renderLists() {
  document.querySelector("#expenseTotalLabel").textContent = `${money(state.expenses.filter((e) => getMonthKey(e.date) === thisMonth()).reduce((s, e) => s + e.amount, 0))} this month`;
  document.querySelector("#expenseList").innerHTML = entryHtml(state.expenses, (e) => `${e.category}<small>${e.date} â€¢ ${e.paidBy || "Not specified"} â€¢ ${e.notes || "No notes"}</small>`, (e) => money(e.amount));
  document.querySelector("#assetTotalLabel").textContent = `${money(state.assets.reduce((s, a) => s + asNumber(a.currentValue || a.amount), 0))} total`;
  document.querySelector("#assetList").innerHTML = entryHtml(state.assets, (a) => `${a.name}<small>${a.date} â€¢ Invested ${money(a.amount)}</small>`, (a) => money(a.currentValue || a.amount));
  const openLiabilityTotal = state.liabilities.filter((l) => l.status === "open").reduce((s, l) => s + l.amount, 0);
  document.querySelector("#liabilityTotalLabel").textContent = `${money(openLiabilityTotal)} open`;
  document.querySelector("#liabilityList").innerHTML = entryHtml(state.liabilities, (l) => `${l.name}<small>${l.dueDate} â€¢ ${l.status}</small>`, (l) => money(l.amount));
  document.querySelector("#productCountLabel").textContent = `${state.products.length} products`;
  document.querySelector("#productList").innerHTML = entryHtml(state.products, (p) => `${p.name}<small>${p.sku || "No SKU"} â€¢ Cost ${money(p.cost)}</small>`, (p) => money(p.price));
}

function entryHtml(items, titleFn, amountFn) {
  return items.length
    ? items
        .slice()
        .reverse()
        .map((item) => `<div class="entry"><div><strong>${titleFn(item)}</strong></div><strong>${amountFn(item)}</strong></div>`)
        .join("")
    : `<div class="entry"><div><strong>No entries yet</strong><small>Saved records will appear here.</small></div></div>`;
}

function renderSettings() {
  document.querySelector("#brandName").textContent = state.settings.businessName;
  document.querySelector("#settingBusinessName").value = state.settings.businessName;
  document.querySelector("#settingCurrency").value = state.settings.currency;
  document.querySelector("#settingBuffer").value = state.settings.bufferPercent;
  document.querySelector("#settingTagline").value = state.settings.tagline;
  document.querySelector("#supabaseUrl").value = state.supabase?.url || "";
  document.querySelector("#supabaseAnonKey").value = state.supabase?.anonKey || "";
  if (isSupabaseReady()) setSyncStatus(document.querySelector("#syncStatus")?.textContent || "Synced", document.querySelector("#syncStatus")?.classList.contains("online"), syncMessage || "Supabase details are saved.");
  else setSyncStatus("Local only", false, "Enter your project URL and anon key to enable shared storage.");
}

function renderDatalists() {
  document.querySelector("#customerList").innerHTML = state.customers.map((c) => `<option value="${c.name}"></option>`).join("");
  let productOptions = document.querySelector("#productListOptions");
  if (!productOptions) {
    productOptions = document.createElement("datalist");
    productOptions.id = "productListOptions";
    document.body.append(productOptions);
  }
  productOptions.innerHTML = state.products.map((p) => `<option value="${p.name}"></option>`).join("");
}

function renderInvoice(order) {
  activeInvoiceOrder = order;
  const totals = calculateOrder(order);
  document.querySelector("#invoiceContent").innerHTML = `
    <div class="invoice-header">
      <div>
        <h2>${state.settings.businessName}</h2>
        <p>${state.settings.tagline}</p>
      </div>
      <div>
        <strong>Invoice</strong>
        <p>${order.orderNumber}<br />${order.date}</p>
      </div>
    </div>
    <p><strong>Bill To:</strong> ${order.customerName}<br />${order.customerContact || ""}</p>
    <table>
      <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
      <tbody>${order.items.map((item) => `<tr><td>${item.name}</td><td>${item.qty}</td><td>${money(item.price)}</td><td>${money(item.qty * item.price)}</td></tr>`).join("")}</tbody>
    </table>
    <div class="totals-box">
      <div><span>Subtotal</span><strong>${money(totals.subtotal)}</strong></div>
      <div><span>Discount</span><strong>${money(totals.discount)}</strong></div>
      <div><span>Delivery</span><strong>${money(order.deliveryFee)}</strong></div>
      <div><span class="invoice-total">Total Due</span><strong class="invoice-total">${money(totals.total)}</strong></div>
    </div>
    <p><strong>Notes:</strong> ${order.notes || "Thank you for your patronage."}</p>
  `;
  document.querySelector("#invoiceDialog").showModal();
}

function invoiceText(order) {
  const totals = calculateOrder(order);
  const items = order.items.map((item) => `${item.name} x${item.qty}: ${money(item.qty * item.price)}`).join("\n");
  return `${state.settings.businessName}\nInvoice ${order.orderNumber}\nCustomer: ${order.customerName}\n\n${items}\n\nDiscount: ${money(totals.discount)}\nDelivery: ${money(order.deliveryFee)}\nTotal Due: ${money(totals.total)}\n\n${state.settings.tagline}`;
}

function renderAll() {
  renderSettings();
  renderDatalists();
  renderDashboard();
  renderOrders();
  renderLists();
  updateOrderPreview();
  renderAuth();
}

function resetOrderForm() {
  document.querySelector("#orderForm").reset();
  document.querySelector("#orderDate").value = today;
  document.querySelector("#itemsContainer").innerHTML = "";
  addItemRow();
}

document.querySelectorAll("[data-view], [data-view-shortcut]").forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.view || button.dataset.viewShortcut));
});

document.querySelector("#addItemBtn").addEventListener("click", () => addItemRow());
["discountType", "discountValue", "deliveryFee", "deliveryCost", "orderDate"].forEach((id) => document.querySelector(`#${id}`).addEventListener("input", updateOrderPreview));

document.querySelector("#customerName").addEventListener("change", (event) => {
  const customer = state.customers.find((c) => c.name === event.target.value);
  if (customer) document.querySelector("#customerContact").value = customer.contact || "";
});

document.querySelector("#orderImageInput").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  const wrap = document.querySelector("#orderImagePreviewWrap");
  const image = document.querySelector("#orderImagePreview");
  if (!file) {
    wrap.classList.add("hidden");
    image.removeAttribute("src");
    setOrderExtractStatus("Works best with screenshots, handwritten order notes, or chat/order confirmation photos.");
    return;
  }
  image.src = await readFileAsDataUrl(file);
  wrap.classList.remove("hidden");
  setOrderExtractStatus("Image ready. Tap Extract Details to draft the order.");
});

document.querySelector("#clearOrderImageBtn").addEventListener("click", () => {
  document.querySelector("#orderImageInput").value = "";
  document.querySelector("#orderImagePreview").removeAttribute("src");
  document.querySelector("#orderImagePreviewWrap").classList.add("hidden");
  setOrderExtractStatus("Works best with screenshots, handwritten order notes, or chat/order confirmation photos.");
});

document.querySelector("#extractOrderBtn").addEventListener("click", async () => {
  const file = document.querySelector("#orderImageInput").files?.[0];
  if (!file) {
    setOrderExtractStatus("Choose or take a photo first.");
    return;
  }
  const button = document.querySelector("#extractOrderBtn");
  button.disabled = true;
  button.textContent = "Extracting...";
  setOrderExtractStatus("Reading the image and drafting the order...");
  try {
    const imageDataUrl = await readFileAsDataUrl(file);
    const response = await fetch("/api/extract-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageDataUrl,
        today,
        products: state.products.map((product) => ({
          name: product.name,
          sku: product.sku,
          cost: product.cost,
          price: product.price
        }))
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Extraction failed.");
    fillOrderDraft(data);
    setOrderExtractStatus("Draft filled. Please review every field before saving.");
    toast("Order draft extracted.");
  } catch (error) {
    setOrderExtractStatus(error.message);
    toast("Could not extract order.");
  } finally {
    button.disabled = false;
    button.textContent = "Extract Details";
  }
});

document.querySelector("#orderForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const date = document.querySelector("#orderDate").value || today;
  const order = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    orderNumber: generateOrderNumber(date),
    customerName: document.querySelector("#customerName").value.trim(),
    customerContact: document.querySelector("#customerContact").value.trim(),
    date,
    discountType: document.querySelector("#discountType").value,
    discountValue: asNumber(document.querySelector("#discountValue").value),
    deliveryFee: asNumber(document.querySelector("#deliveryFee").value),
    deliveryCost: asNumber(document.querySelector("#deliveryCost").value),
    paymentStatus: document.querySelector("#paymentStatus").value,
    notes: document.querySelector("#orderNotes").value.trim(),
    items: getDraftItems().filter((item) => item.name && item.qty > 0)
  };
  if (!order.items.length) return toast("Add at least one product.");
  state.orders.push(order);
  if (!state.customers.some((c) => c.name.toLowerCase() === order.customerName.toLowerCase())) {
    state.customers.push({ id: crypto.randomUUID(), name: order.customerName, contact: order.customerContact });
  }
  saveState();
  resetOrderForm();
  toast("Order saved.");
});

document.querySelector("#ordersTable").addEventListener("click", (event) => {
  const invoiceId = event.target.dataset.invoice;
  const deleteId = event.target.dataset.deleteOrder;
  if (invoiceId) renderInvoice(state.orders.find((order) => order.id === invoiceId));
  if (deleteId) {
    state.orders = state.orders.filter((order) => order.id !== deleteId);
    saveState();
    toast("Order deleted.");
  }
});

document.querySelector("#expenseForm").addEventListener("submit", (event) => {
  event.preventDefault();
  state.expenses.push({
    id: crypto.randomUUID(),
    category: document.querySelector("#expenseCategory").value,
    amount: asNumber(document.querySelector("#expenseAmount").value),
    date: document.querySelector("#expenseDate").value || today,
    paidBy: document.querySelector("#expensePaidBy").value.trim(),
    notes: document.querySelector("#expenseNotes").value.trim()
  });
  event.target.reset();
  document.querySelector("#expenseDate").value = today;
  saveState();
  toast("Expense saved.");
});

document.querySelector("#assetForm").addEventListener("submit", (event) => {
  event.preventDefault();
  state.assets.push({
    id: crypto.randomUUID(),
    name: document.querySelector("#assetName").value.trim(),
    amount: asNumber(document.querySelector("#assetAmount").value),
    currentValue: asNumber(document.querySelector("#assetCurrent").value),
    date: document.querySelector("#assetDate").value || today
  });
  event.target.reset();
  document.querySelector("#assetDate").value = today;
  saveState();
  toast("Asset saved.");
});

document.querySelector("#liabilityForm").addEventListener("submit", (event) => {
  event.preventDefault();
  state.liabilities.push({
    id: crypto.randomUUID(),
    name: document.querySelector("#liabilityName").value.trim(),
    amount: asNumber(document.querySelector("#liabilityAmount").value),
    dueDate: document.querySelector("#liabilityDate").value || today,
    status: document.querySelector("#liabilityStatus").value
  });
  event.target.reset();
  document.querySelector("#liabilityDate").value = today;
  saveState();
  toast("Liability saved.");
});

document.querySelector("#settingsForm").addEventListener("submit", (event) => {
  event.preventDefault();
  state.settings = {
    businessName: document.querySelector("#settingBusinessName").value.trim() || "Heart Health Hub",
    currency: document.querySelector("#settingCurrency").value.trim() || "â‚¦",
    bufferPercent: asNumber(document.querySelector("#settingBuffer").value),
    tagline: document.querySelector("#settingTagline").value.trim()
  };
  saveState();
  toast("Settings saved.");
});

document.querySelector("#supabaseForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitButton = event.target.querySelector("button[type='submit']");
  submitButton.disabled = true;
  submitButton.textContent = "Connecting...";
  state.supabase = {
    enabled: true,
    url: document.querySelector("#supabaseUrl").value.trim(),
    anonKey: document.querySelector("#supabaseAnonKey").value.trim()
  };
  localStorage.setItem(storeKey, JSON.stringify(state));
  try {
    if (!isSignedIn()) {
      renderAll();
      setAuthMessage("Supabase is connected. Sign in or create an account to continue.");
      setSyncStatus("Sign in needed", false, "Sign in before loading shared Supabase records.");
      return;
    }
    await loadFromSupabase({ keepLocalWhenRemoteEmpty: true });
    await syncAllToSupabase();
    toast("Supabase connected.");
  } catch (error) {
    setSyncStatus("Sync failed", false, error.message);
    toast("Supabase connection failed.");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Connect Supabase";
  }
});

document.querySelector("#disableSupabase").addEventListener("click", () => {
  state.supabase.enabled = false;
  state.auth = { accessToken: "", refreshToken: "", email: "" };
  saveState();
  setSyncStatus("Local only", false);
  toast("Using local storage only.");
});

document.querySelector("#authForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!isSupabaseReady()) {
    setAuthMessage("Add your Supabase URL and anon key in Settings first.");
    return;
  }
  const email = document.querySelector("#authEmail").value.trim();
  const password = document.querySelector("#authPassword").value;
  setAuthMessage("Signing in...");
  try {
    const data = await supabaseAuth("token?grant_type=password", { email, password });
    state.auth = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      email: data.user?.email || email
    };
    localStorage.setItem(storeKey, JSON.stringify(state));
    renderAll();
    const hasRemoteData = await loadFromSupabase({ keepLocalWhenRemoteEmpty: true });
    if (hasRemoteData === false) await syncAllToSupabase();
    toast("Signed in.");
  } catch (error) {
    setAuthMessage(error.message);
  }
});

document.querySelector("#createAccountBtn").addEventListener("click", async () => {
  if (!isSupabaseReady()) {
    setAuthMessage("Add your Supabase URL and anon key in Settings first.");
    return;
  }
  const email = document.querySelector("#authEmail").value.trim();
  const password = document.querySelector("#authPassword").value;
  if (!email || password.length < 6) {
    setAuthMessage("Enter an email and a password with at least 6 characters.");
    return;
  }
  setAuthMessage("Creating account...");
  try {
    const data = await supabaseAuth("signup", { email, password });
    if (data.access_token) {
      state.auth = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        email: data.user?.email || email
      };
      localStorage.setItem(storeKey, JSON.stringify(state));
      renderAll();
      await syncAllToSupabase();
      toast("Account created.");
    } else {
      setAuthMessage("Account created. Check your email if Supabase asks for confirmation, then sign in.");
    }
  } catch (error) {
    setAuthMessage(error.message);
  }
});

document.querySelector("#signOutBtn").addEventListener("click", () => {
  state.auth = { accessToken: "", refreshToken: "", email: "" };
  localStorage.setItem(storeKey, JSON.stringify(state));
  renderAll();
  setSyncStatus("Signed out", false, "Sign in to use shared Supabase records.");
  toast("Signed out.");
});

document.querySelector("#accountBtn").addEventListener("click", () => {
  setView("settings");
});

document.querySelector("#productForm").addEventListener("submit", (event) => {
  event.preventDefault();
  state.products.push({
    id: crypto.randomUUID(),
    name: document.querySelector("#productName").value.trim(),
    sku: document.querySelector("#productSku").value.trim(),
    cost: asNumber(document.querySelector("#productCost").value),
    price: asNumber(document.querySelector("#productPrice").value)
  });
  event.target.reset();
  saveState();
  toast("Product added.");
});

document.querySelector("#closeInvoice").addEventListener("click", () => document.querySelector("#invoiceDialog").close());
document.querySelector("#printInvoice").addEventListener("click", () => window.print());
document.querySelector("#copyInvoice").addEventListener("click", async () => {
  if (!activeInvoiceOrder) return;
  await navigator.clipboard.writeText(invoiceText(activeInvoiceOrder));
  toast("Invoice text copied.");
});

document.querySelector("#exportBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `finance-dashboard-${today}.json`;
  link.click();
  URL.revokeObjectURL(url);
});

["orderDate", "expenseDate", "assetDate", "liabilityDate"].forEach((id) => {
  document.querySelector(`#${id}`).value = today;
});

resetOrderForm();
renderAll();
loadFromSupabase({ keepLocalWhenRemoteEmpty: true }).then((hasRemoteData) => {
  if (hasRemoteData === false && isSupabaseReady() && isSignedIn()) {
    syncAllToSupabase().catch((error) => setSyncStatus("Sync failed", false, error.message));
  }
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  });
}
