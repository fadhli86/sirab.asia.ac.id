import React from "react";

const STORAGE_KEY = "rab-hibah-draft-v1";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Sistem RAB Hibah mengalami error:", error, info);
  }

  resetDraft = () => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* localStorage tidak tersedia — abaikan */
    }
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#FBF8F2",
          color: "#2A241C",
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 480, textAlign: "center" }}>
          <h1 style={{ fontSize: 22, marginBottom: 12 }}>Terjadi kesalahan pada aplikasi</h1>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: "#6B6252", marginBottom: 20 }}>
            Sistem RAB Hibah gagal dimuat, kemungkinan karena draft tersimpan tidak
            kompatibel dengan versi terbaru. Anda bisa memuat ulang, atau mengatur ulang
            draft tersimpan (data isian saat ini akan hilang — unduh CSV/Excel dulu bila
            memungkinkan lewat DevTools/Console jika halaman masih sebagian tampil).
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                border: "1.5px solid #E4DCCF", background: "#fff", padding: "9px 16px",
                borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: "pointer", color: "#2A241C",
              }}
            >
              Muat Ulang Halaman
            </button>
            <button
              onClick={this.resetDraft}
              style={{
                border: "1.5px solid #A23B23", background: "#A23B23", padding: "9px 16px",
                borderRadius: 8, fontSize: 13.5, fontWeight: 700, cursor: "pointer", color: "#fff",
              }}
            >
              Reset Draft & Muat Ulang
            </button>
          </div>
        </div>
      </div>
    );
  }
}
