import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";

const wasteTypes = ["All materials", "Rice straw", "Wheat straw", "Coconut husk", "Corn stalks", "Sugarcane bagasse", "Groundnut shells"];
const blankListing = {
  wasteType: "Rice straw",
  cropType: "Paddy",
  quantity: "",
  unit: "tons",
  quality: "Standard",
  location: "",
  availableFrom: new Date().toISOString().slice(0, 10),
  pricePerUnit: "",
  description: "",
  imageUrl: "",
};
const blankRequest = { quantity: "", offeredPrice: "", preferredPickupDate: "", message: "" };

const money = (amount) => `₹${Number(amount || 0).toLocaleString("en-IN")}`;
const dateLabel = (date) => date ? new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Date flexible";
const statusLabel = (status) => status?.toLowerCase().replaceAll("_", " ") || "unknown";

function ListingCard({ listing, user, onRequest, onListingAction, onToggleSave, isSaved }) {
  const image = listing.imageUrl || "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1000&q=85";
  const own = String(listing.farmer?._id || listing.farmer?.id || listing.farmer) === String(user.id);
  const isFarmer = user.role === "FARMER";
  return (
    <article className="listing-card">
      <div className="listing-photo" style={{ backgroundImage: `linear-gradient(180deg, transparent 45%, rgba(20, 42, 31, .58)), url("${image}")` }}>
        <span className="material-tag">{listing.wasteType}</span>
        <span className="photo-grade">{listing.quality || "Standard grade"}</span>
        {!own && user.role !== "ADMIN" && <button className={`listing-save ${isSaved ? "listing-saved" : ""}`} aria-label={isSaved ? "Remove saved material" : "Save material"} title={isSaved ? "Remove from saved materials" : "Save material"} onClick={() => onToggleSave(listing)}>{isSaved ? "★" : "☆"}</button>}
      </div>
      <div className="listing-content">
        <div className="listing-heading">
          <div>
            <p className="crop-label">{listing.cropType} residue</p>
            <h3>{listing.wasteType}</h3>
          </div>
          <div className="listing-price"><strong>{money(listing.pricePerUnit)}</strong><span>per {listing.unit?.replace(/s$/, "")}</span></div>
        </div>
        <div className="listing-facts">
          <span><b>{Number(listing.quantity).toLocaleString("en-IN")}</b> {listing.unit} available</span>
          <span>{listing.location}</span>
        </div>
        <p className="listing-description">{listing.description || "Crop residue ready for productive reuse. Contact the grower for handling and pickup details."}</p>
        <div className="seller-row">
          <span className="seller-avatar">{(listing.farmer?.name || "F").slice(0, 1).toUpperCase()}</span>
          <span className="seller-copy"><strong>{listing.farmer?.name || "Local farmer"}</strong><small>{listing.farmer?.location || listing.location}{listing.farmer?.isVerified ? " · Verified" : ""}</small></span>
          <span className="available-date">From {dateLabel(listing.availableFrom)}</span>
        </div>
        {isFarmer && own ? (
          <div className="card-actions">
            {listing.status !== "SOLD" && <button className="button button-secondary button-small" onClick={() => onListingAction(listing, "EDIT")}>Edit</button>}
            {listing.status !== "SOLD" && <button className="button button-secondary button-small" onClick={() => onListingAction(listing, listing.status === "AVAILABLE" ? "PAUSED" : "AVAILABLE")}>{listing.status === "AVAILABLE" ? "Pause listing" : "Resume listing"}</button>}
            <button className="text-button" onClick={() => onListingAction(listing, "DELETE")}>Remove</button>
          </div>
        ) : user.role === "INDUSTRY" ? (
          <button className="button button-dark button-full" onClick={() => onRequest(listing)}>Request material <span aria-hidden="true">↗</span></button>
        ) : null}
      </div>
    </article>
  );
}

function ListingDialog({ onClose, onSubmit, listing }) {
  const [form, setForm] = useState(() => listing ? {
    ...blankListing,
    ...listing,
    availableFrom: new Date(listing.availableFrom).toISOString().slice(0, 10),
  } : blankListing);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const change = (event) => setForm({ ...form, [event.target.name]: event.target.value });
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onSubmit({ ...form, quantity: Number(form.quantity), pricePerUnit: Number(form.pricePerUnit) });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Could not publish this listing. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="modal-panel" onSubmit={submit}>
        <div className="modal-header"><div><span className="eyebrow">SUPPLY TO THE MARKET</span><h2>{listing ? "Edit listing" : "List a material"}</h2></div><button type="button" className="close-button" onClick={onClose} aria-label="Close">×</button></div>
        <p className="modal-intro">Give buyers the details they need to make a confident request.</p>
        {error && <p className="form-error">{error}</p>}
        <div className="form-grid">
          <label>Waste material<select name="wasteType" value={form.wasteType} onChange={change}>{wasteTypes.slice(1).map((type) => <option key={type}>{type}</option>)}<option>Banana waste</option><option>Cotton stalks</option><option>Other crop residue</option></select></label>
          <label>Source crop<input name="cropType" value={form.cropType} onChange={change} required /></label>
          <label>Quantity<input name="quantity" type="number" min="0.01" step="0.01" value={form.quantity} onChange={change} placeholder="e.g. 5" required /></label>
          <label>Unit<select name="unit" value={form.unit} onChange={change}><option value="tons">Tons</option><option value="kg">Kilograms</option><option value="bales">Bales</option></select></label>
          <label>Price per unit (₹)<input name="pricePerUnit" type="number" min="0" step="1" value={form.pricePerUnit} onChange={change} placeholder="e.g. 4000" required /></label>
          <label>Quality / grade<input name="quality" value={form.quality} onChange={change} required /></label>
          <label>Pickup location<input name="location" value={form.location} onChange={change} placeholder="Town, district" required /></label>
          <label>Available from<input name="availableFrom" type="date" value={form.availableFrom} onChange={change} required /></label>
          <label className="form-span">Photo URL <span className="optional-label">optional</span><input name="imageUrl" type="url" value={form.imageUrl} onChange={change} placeholder="https://..." /></label>
          <label className="form-span">Material notes <span className="optional-label">optional</span><textarea name="description" value={form.description} onChange={change} rows="3" placeholder="Moisture, storage, packaging, or pickup notes" /></label>
        </div>
        <div className="modal-footer"><button type="button" className="button button-secondary" onClick={onClose}>Cancel</button><button className="button button-green" disabled={busy}>{busy ? "Saving…" : listing ? "Save changes" : "Publish listing"}</button></div>
      </form>
    </div>
  );
}

function RequestDialog({ listing, onClose, onSubmit }) {
  const [form, setForm] = useState({ ...blankRequest, quantity: Math.min(1, listing.quantity), offeredPrice: listing.pricePerUnit });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const change = (event) => setForm({ ...form, [event.target.name]: event.target.value });
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onSubmit({ ...form, listingId: listing._id, quantity: Number(form.quantity), offeredPrice: Number(form.offeredPrice) });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Could not send this request. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="modal-panel modal-panel-narrow" onSubmit={submit}>
        <div className="modal-header"><div><span className="eyebrow">PURCHASE REQUEST</span><h2>{listing.wasteType}</h2></div><button type="button" className="close-button" onClick={onClose} aria-label="Close">×</button></div>
        <p className="modal-intro">{listing.quantity} {listing.unit} listed at {money(listing.pricePerUnit)} per {listing.unit?.replace(/s$/, "")}. The farmer can accept, decline, or counter your offer.</p>
        {error && <p className="form-error">{error}</p>}
        <div className="form-grid">
          <label>Quantity needed ({listing.unit})<input name="quantity" type="number" min="0.01" max={listing.quantity} step="0.01" value={form.quantity} onChange={change} required /></label>
          <label>Your offer per unit (₹)<input name="offeredPrice" type="number" min="0" step="1" value={form.offeredPrice} onChange={change} required /></label>
          <label className="form-span">Preferred pickup date<input name="preferredPickupDate" type="date" value={form.preferredPickupDate} onChange={change} /></label>
          <label className="form-span">Message<textarea name="message" value={form.message} onChange={change} rows="3" placeholder="Share your pickup or material requirements" /></label>
        </div>
        <div className="modal-footer"><button type="button" className="button button-secondary" onClick={onClose}>Cancel</button><button className="button button-green" disabled={busy}>{busy ? "Sending…" : "Send request"}</button></div>
      </form>
    </div>
  );
}

function ReviewDialog({ order, onClose, onSubmit }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onSubmit({ rating, comment });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Could not save your review.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="modal-panel modal-panel-narrow" onSubmit={submit}>
        <div className="modal-header"><div><span className="eyebrow">TRADE FEEDBACK</span><h2>How did it go?</h2></div><button type="button" className="close-button" onClick={onClose} aria-label="Close">×</button></div>
        <p className="modal-intro">Your feedback helps {order.partnerName || "your trade partner"} build trust in the marketplace.</p>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="rating-picker" role="group" aria-label="Choose a star rating">
          {[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" aria-label={`${value} star${value === 1 ? "" : "s"}`} aria-pressed={rating === value} className={value <= rating ? "rating-star rating-star-active" : "rating-star"} onClick={() => setRating(value)}>★</button>)}
        </div>
        <label className="review-label">A few words <span className="optional-label">optional</span><textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength="500" rows="4" placeholder="Quality, communication, or how the handoff went" /></label>
        <div className="review-character-count">{comment.length}/500</div>
        <div className="modal-footer"><button type="button" className="button button-secondary" onClick={onClose}>Cancel</button><button className="button button-green" disabled={busy}>{busy ? "Saving…" : "Submit review"}</button></div>
      </form>
    </div>
  );
}

function RequestCard({ request, user, onRespond, onComplete, onReview, ownReview, receivedReview }) {
  const buyer = user.role === "INDUSTRY";
  const otherParty = buyer ? request.farmer : request.buyer;
  const myCompletion = buyer ? request.completedByBuyer : request.completedByFarmer;
  const canRespond = (!buyer && ["PENDING", "COUNTERED"].includes(request.status)) || (buyer && request.status === "COUNTERED");
  const onAction = async (action) => {
    let counterPrice;
    if (action === "COUNTER") {
      const answer = window.prompt("Your counter-offer per unit (₹):", request.offeredPrice);
      if (answer === null) return;
      counterPrice = Number(answer);
      if (!Number.isFinite(counterPrice) || counterPrice < 0) return window.alert("Enter a valid price.");
    }
    await onRespond(request._id, { action, counterPrice });
  };
  return (
    <article className="request-card">
      <div className="request-card-top"><span className={`status-pill status-${request.status?.toLowerCase()}`}>{statusLabel(request.status)}</span><span className="request-date">{dateLabel(request.createdAt)}</span></div>
      <div className="request-main"><div><span className="eyebrow">{buyer ? "YOUR REQUEST" : "BUYER REQUEST"}</span><h3>{request.listing?.wasteType || "Material request"}</h3><p>{request.quantity} {request.listing?.unit || "tons"} · {money(request.offeredPrice)} / unit</p></div><div className="request-total">{money(request.quantity * (request.status === "COUNTERED" && buyer ? request.counterPrice : request.offeredPrice))}<small>estimated value</small></div></div>
      <div className="request-details"><span>From <strong>{otherParty?.companyName || otherParty?.name || "Marketplace member"}</strong></span><span>{request.listing?.location || otherParty?.location || "Location not listed"}</span>{request.preferredPickupDate && <span>Pickup {dateLabel(request.preferredPickupDate)}</span>}</div>
      {request.message && <p className="request-message">“{request.message}”</p>}
      {request.responseMessage && <p className="request-message response-message">Reply: {request.responseMessage}</p>}
      {request.status === "COUNTERED" && buyer && <p className="counter-note">Counter-offer: <strong>{money(request.counterPrice)} / unit</strong></p>}
      <div className="request-actions">
        {canRespond && !buyer && <><button className="button button-green button-small" onClick={() => onAction("ACCEPT")}>Accept & create order</button><button className="button button-secondary button-small" onClick={() => onAction("COUNTER")}>Counter-offer</button><button className="text-button" onClick={() => onAction("REJECT")}>Decline</button></>}
        {canRespond && buyer && <button className="button button-green button-small" onClick={() => onAction("ACCEPT_COUNTER")}>Accept counter & create order</button>}
        {request.status === "ACCEPTED" && <><span className="order-confirmed">{myCompletion ? "Your completion confirmed" : "Order confirmed"}</span><button className="button button-secondary button-small" disabled={myCompletion} onClick={() => onComplete(request._id)}>{myCompletion ? "Awaiting other party" : "Mark complete"}</button></>}
        {request.status === "COMPLETED" && <span className="order-confirmed">Transaction complete</span>}
      </div>
      {request.status === "COMPLETED" && <div className="review-summary">
        {ownReview ? <div><span className="review-summary-title">Your review <strong>{"★".repeat(ownReview.rating)}{"☆".repeat(5 - ownReview.rating)}</strong></span>{ownReview.comment && <p>{ownReview.comment}</p>}</div> : <button className="button button-secondary button-small" onClick={() => onReview(request, otherParty)}>＋ Rate your trade partner</button>}
        {receivedReview && <div className="received-review"><span className="review-summary-title">{receivedReview.reviewer?.name || "Your partner"} rated you <strong>{"★".repeat(receivedReview.rating)}</strong></span>{receivedReview.comment && <p>{receivedReview.comment}</p>}</div>}
      </div>}
    </article>
  );
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState(user.role === "ADMIN" ? "admin" : "market");
  const [listings, setListings] = useState([]);
  const [myListings, setMyListings] = useState([]);
  const [savedListings, setSavedListings] = useState([]);
  const [requests, setRequests] = useState([]);
  const [orders, setOrders] = useState([]);
  const [myReviews, setMyReviews] = useState([]);
  const [receivedReviews, setReceivedReviews] = useState([]);
  const [overview, setOverview] = useState(null);
  const [adminUsers, setAdminUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("All materials");
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [listingDialog, setListingDialog] = useState(false);
  const [editingListing, setEditingListing] = useState(null);
  const [requestListing, setRequestListing] = useState(null);
  const [reviewOrder, setReviewOrder] = useState(null);

  const refresh = useCallback(async () => {
    const calls = [["listings", api.get("/listings")]];
    if (user.role === "FARMER") calls.push(["myListings", api.get("/listings/mine")]);
    if (user.role !== "ADMIN") {
      calls.push(["savedListings", api.get("/listings/saved")]);
      calls.push(["myReviews", api.get("/reviews/mine")], ["receivedReviews", api.get("/reviews/received")]);
    }
    calls.push(["requests", api.get("/requests")], ["orders", api.get("/requests/orders")]);
    if (user.role === "ADMIN") calls.push(["overview", api.get("/admin/overview")], ["adminUsers", api.get("/admin/users")]);
    const results = await Promise.allSettled(calls.map(([, request]) => request));
    const responses = Object.fromEntries(calls.map(([key], index) => [
      key,
      results[index].status === "fulfilled" ? results[index].value.data : null,
    ]));
    if (responses.listings) setListings(responses.listings.listings || []);
    else setPageError(results[0].reason.response?.data?.message || "Could not load the marketplace.");
    if (responses.myListings) setMyListings(responses.myListings.listings || []);
    if (responses.savedListings) setSavedListings(responses.savedListings.listings || []);
    if (responses.requests) setRequests(responses.requests.requests || []);
    if (responses.orders) setOrders(responses.orders.orders || []);
    if (responses.myReviews) setMyReviews(responses.myReviews.reviews || []);
    if (responses.receivedReviews) setReceivedReviews(responses.receivedReviews.reviews || []);
    if (responses.overview) setOverview(responses.overview.overview);
    if (responses.adminUsers) setAdminUsers(responses.adminUsers.users || []);
    setLoading(false);
  }, [user.role]);

  useEffect(() => { void Promise.resolve().then(refresh); }, [refresh]);

  const runAction = async (action) => {
    setPageError("");
    try {
      await action();
      await refresh();
    } catch (err) {
      setPageError(err.response?.data?.message || "Something went wrong. Please try again.");
    }
  };

  const onLogout = () => { logout(); navigate("/login"); };
  const handleListingAction = (listing, action) => {
    if (action === "EDIT") {
      setEditingListing(listing);
      return;
    }
    runAction(async () => {
      if (action === "DELETE") await api.delete(`/listings/${listing._id}`);
      else await api.patch(`/listings/${listing._id}`, { status: action });
    });
  };
  const toggleSaved = (listing) => runAction(() => api.put(`/listings/${listing._id}/saved`, {
    saved: !savedListings.some((saved) => String(saved._id) === String(listing._id)),
  }));
  const showReviewDialog = (order, partner) => setReviewOrder({ ...order, partnerName: partner?.companyName || partner?.name });
  const reviewForOrder = (reviews, order) => reviews.find((review) => String(review.order?._id || review.order) === String(order._id));
  const shownListings = activeView === "listings" ? myListings : activeView === "saved" ? savedListings : listings;
  const filteredListings = shownListings.filter((listing) => {
    const matchesType = selectedType === "All materials" || listing.wasteType.toLowerCase() === selectedType.toLowerCase();
    const term = search.trim().toLowerCase();
    const matchesSearch = !term || [listing.wasteType, listing.cropType, listing.location, listing.farmer?.name].some((value) => value?.toLowerCase().includes(term));
    return matchesType && matchesSearch;
  });

  const navItems = [
    { id: "market", label: "Explore materials", symbol: "⌕", roles: ["FARMER", "INDUSTRY"] },
    { id: "listings", label: "My listings", symbol: "▤", roles: ["FARMER"] },
    { id: "saved", label: "Saved materials", symbol: "☆", roles: ["FARMER", "INDUSTRY"] },
    { id: "requests", label: "Requests", symbol: "↔", roles: ["FARMER", "INDUSTRY"] },
    { id: "orders", label: "Orders", symbol: "◷", roles: ["FARMER", "INDUSTRY"] },
    { id: "admin", label: "Platform overview", symbol: "▥", roles: ["ADMIN"] },
  ].filter((item) => item.roles.includes(user.role));
  const pendingCount = requests.filter((request) => user.role === "FARMER" ? ["PENDING", "COUNTERED"].includes(request.status) : request.status === "COUNTERED").length;
  const greeting = user.name?.split(" ")[0] || "there";

  return (
    <div className="workspace-shell">
      <aside className="sidebar">
        <a className="brand-lockup" href="/dashboard"><span className="brand-mark">A<span>+</span></span><span className="brand-name">agriwaste<small>CONNECT</small></span></a>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          {navItems.map((item) => <button key={item.id} aria-label={item.label} className={`nav-item ${activeView === item.id ? "nav-active" : ""}`} onClick={() => setActiveView(item.id)}><span className="nav-symbol">{item.symbol}</span><span>{item.label}</span>{item.id === "requests" && pendingCount > 0 && <b className="nav-count">{pendingCount}</b>}</button>)}
        </nav>
        <div className="sidebar-bottom">
          <div className="impact-note"><span className="impact-spark">✳</span><strong>Waste has value.</strong><p>Every connection can keep useful crop residue in circulation.</p></div>
          <div className="profile-row"><span className="profile-avatar">{user.name?.slice(0, 1).toUpperCase()}</span><span className="profile-copy"><strong>{user.name}</strong><small>{user.role === "INDUSTRY" ? user.companyName || "Industry buyer" : user.role.toLowerCase()}</small></span><button className="logout-button" onClick={onLogout} title="Sign out" aria-label="Sign out">↗</button></div>
        </div>
      </aside>

      <main className="workspace-main">
        <header className="topbar"><div className="breadcrumbs"><span>AgriWaste Connect</span><b>/</b><strong>{navItems.find((item) => item.id === activeView)?.label || "Workspace"}</strong></div><div className="topbar-user"><span className="online-dot" />{user.location || "India"}<span className="topbar-divider" /><span>{user.role === "INDUSTRY" ? "Buyer account" : user.role === "ADMIN" ? "Administrator" : "Farmer account"}</span></div></header>

        {(activeView === "market" || activeView === "saved") && <>
          {activeView === "market" && <section className="welcome-banner"><div className="welcome-copy"><span className="eyebrow eyebrow-light">THE CIRCULAR MATERIALS MARKETPLACE</span><h1>Good morning, {greeting}.</h1><p>Crop residue is a resource. Find the right material, partner, and next step.</p><div className="welcome-stats"><span><strong>{listings.length}</strong> materials available</span><i /><span><strong>{orders.length}</strong> active orders</span></div></div><div className="banner-mark" aria-hidden="true"><span>↗</span></div></section>}
          <section className="market-controls"><div><span className="eyebrow">{activeView === "saved" ? "YOUR SHORTLIST" : "MARKETPLACE"}</span><h2>{activeView === "saved" ? "Saved materials" : "Materials near you"}</h2><p>{activeView === "saved" ? "Keep promising supply close while you compare options." : "Browse supply shared directly by growers."}</p></div>{user.role === "FARMER" && activeView === "market" && <button className="button button-green" onClick={() => setListingDialog(true)}><span aria-hidden="true">＋</span> Create a listing</button>}</section>
          <div className="search-controls"><label className="search-field"><span aria-hidden="true">⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search material, crop, or location" aria-label="Search material, crop, or location" /></label><label className="filter-select"><span>Material</span><select value={selectedType} onChange={(event) => setSelectedType(event.target.value)}>{wasteTypes.map((type) => <option key={type}>{type}</option>)}</select></label><span className="result-count">{filteredListings.length} results</span></div>
          {pageError && <div className="notice-error">{pageError}</div>}
          {loading ? <div className="loading-state"><span className="loading-ring" />Loading materials…</div> : filteredListings.length ? <div className="listing-grid">{filteredListings.map((listing) => <ListingCard key={listing._id} listing={listing} user={user} onRequest={setRequestListing} onListingAction={handleListingAction} onToggleSave={toggleSaved} isSaved={savedListings.some((saved) => String(saved._id) === String(listing._id))} />)}</div> : <div className="empty-state"><span>{activeView === "saved" ? "☆" : "∅"}</span><h3>{activeView === "saved" ? "Your shortlist is empty" : "No materials found"}</h3><p>{activeView === "saved" ? "Save a listing that catches your eye and it will be waiting here." : "Try another search, or check back as new crop residue becomes available."}</p>{activeView === "saved" && <button className="button button-green" onClick={() => setActiveView("market")}>Explore materials</button>}{user.role === "FARMER" && activeView === "market" && <button className="button button-green" onClick={() => setListingDialog(true)}>Create the first listing</button>}</div>}
        </>}

        {activeView === "listings" && <>
          <section className="page-heading"><div><span className="eyebrow">YOUR SUPPLY</span><h1>My listings</h1><p>Keep your available crop residue up to date for buyers.</p></div><button className="button button-green" onClick={() => setListingDialog(true)}>＋ Create a listing</button></section>
          <div className="search-controls"><label className="search-field"><span aria-hidden="true">⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search your listings" aria-label="Search your listings" /></label><span className="result-count">{myListings.length} total listings</span></div>
          {pageError && <div className="notice-error">{pageError}</div>}
          {loading ? <div className="loading-state"><span className="loading-ring" />Loading your listings…</div> : filteredListings.length ? <div className="listing-grid">{filteredListings.map((listing) => <ListingCard key={listing._id} listing={listing} user={user} onRequest={setRequestListing} onListingAction={handleListingAction} />)}</div> : <div className="empty-state"><span>▤</span><h3>Your next listing starts here</h3><p>Add your available crop residue so nearby industries can find it.</p><button className="button button-green" onClick={() => setListingDialog(true)}>Create a listing</button></div>}
        </>}

        {activeView === "requests" && <>
          <section className="page-heading"><div><span className="eyebrow">TRADE DESK</span><h1>{user.role === "FARMER" ? "Incoming requests" : "My purchase requests"}</h1><p>{user.role === "FARMER" ? "Review offers, respond, and agree on a fair price." : "Follow each request from first offer to confirmed order."}</p></div><div className="heading-count"><strong>{requests.length}</strong><span>total requests</span></div></section>
          {pageError && <div className="notice-error">{pageError}</div>}
          {loading ? <div className="loading-state"><span className="loading-ring" />Loading requests…</div> : requests.length ? <div className="request-list">{requests.map((request) => <RequestCard key={request._id} request={request} user={user} onRespond={(id, payload) => runAction(() => api.patch(`/requests/${id}`, payload))} onComplete={(id) => runAction(() => api.patch(`/requests/${id}/order-status`, { status: "COMPLETED" }))} onReview={showReviewDialog} ownReview={reviewForOrder(myReviews, request)} receivedReview={reviewForOrder(receivedReviews, request)} />)}</div> : <div className="empty-state"><span>↔</span><h3>No requests yet</h3><p>{user.role === "FARMER" ? "Buyer requests for your listings will show up here." : "When you request material from a grower, it will appear here."}</p>{user.role === "INDUSTRY" && <button className="button button-green" onClick={() => setActiveView("market")}>Explore materials</button>}</div>}
        </>}

        {activeView === "orders" && <>
          <section className="page-heading"><div><span className="eyebrow">FULFILMENT</span><h1>Orders</h1><p>Accepted trade requests, together in one place.</p></div><div className="heading-count"><strong>{orders.length}</strong><span>confirmed orders</span></div></section>
          {pageError && <div className="notice-error">{pageError}</div>}
          {loading ? <div className="loading-state"><span className="loading-ring" />Loading orders…</div> : orders.length ? <div className="request-list">{orders.map((order) => <RequestCard key={order._id} request={order} user={user} onRespond={() => {}} onComplete={(id) => runAction(() => api.patch(`/requests/${id}/order-status`, { status: "COMPLETED" }))} onReview={showReviewDialog} ownReview={reviewForOrder(myReviews, order)} receivedReview={reviewForOrder(receivedReviews, order)} />)}</div> : <div className="empty-state"><span>◷</span><h3>No confirmed orders</h3><p>When a purchase request is accepted, its order will be tracked here.</p><button className="button button-green" onClick={() => setActiveView(user.role === "FARMER" ? "listings" : "market")}>{user.role === "FARMER" ? "Manage listings" : "Explore materials"}</button></div>}
        </>}

        {activeView === "admin" && user.role === "ADMIN" && <>
          <section className="page-heading"><div><span className="eyebrow">OPERATIONS</span><h1>Platform overview</h1><p>Marketplace activity and member verification.</p></div></section>
          {pageError && <div className="notice-error">{pageError}</div>}
          <section className="admin-stats">{[["Farmers", overview?.farmers, "grower accounts"], ["Industries", overview?.industries, "buyer accounts"], ["Available supply", overview?.availableListings, "active listings"], ["Open requests", overview?.pendingRequests, "awaiting response"], ["Completed orders", overview?.completedOrders, "finished trades"], ["All listings", overview?.listings, "including paused and sold"]].map(([label, value, caption]) => <article className="admin-stat" key={label}><span>{label}</span><strong>{value ?? "—"}</strong><small>{caption}</small></article>)}</section>
          <section className="admin-table-section"><div className="table-heading"><div><span className="eyebrow">MEMBERS</span><h2>Verification queue</h2></div><span>{adminUsers.filter((member) => !member.isVerified).length} unverified</span></div><div className="table-scroll"><table><thead><tr><th>Member</th><th>Role</th><th>Location</th><th>Joined</th><th>Verification</th><th /></tr></thead><tbody>{adminUsers.map((member) => <tr key={member._id}><td><strong>{member.companyName || member.name}</strong><small>{member.email}</small></td><td>{member.role}</td><td>{member.location}</td><td>{dateLabel(member.createdAt)}</td><td><span className={`status-pill ${member.isVerified ? "status-accepted" : "status-pending"}`}>{member.isVerified ? "Verified" : "Pending"}</span></td><td><button className="text-button" onClick={() => runAction(() => api.patch(`/admin/users/${member._id}/verify`, { isVerified: !member.isVerified }))}>{member.isVerified ? "Revoke" : "Verify"}</button></td></tr>)}</tbody></table></div></section>
        </>}

        <footer className="workspace-footer"><span>AgriWaste Connect</span><span>Trade locally. Reuse productively.</span></footer>
      </main>
      {(listingDialog || editingListing) && <ListingDialog listing={editingListing} onClose={() => { setListingDialog(false); setEditingListing(null); }} onSubmit={async (payload) => { if (editingListing) await api.patch(`/listings/${editingListing._id}`, payload); else await api.post("/listings", payload); await refresh(); }} />}
      {requestListing && <RequestDialog listing={requestListing} onClose={() => setRequestListing(null)} onSubmit={async (payload) => { await api.post("/requests", payload); await refresh(); }} />}
      {reviewOrder && <ReviewDialog order={reviewOrder} onClose={() => setReviewOrder(null)} onSubmit={async (payload) => { await api.post(`/reviews/${reviewOrder._id}`, payload); await refresh(); }} />}
    </div>
  );
}