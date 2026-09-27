import json
import sys
from datetime import datetime
from pathlib import Path
import pandas as pd
import streamlit as st

BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from src.client import HindsightMemoryClient
from src.config import get_bank_config, load_banks_config, settings
from synthesize import generate_weekly_digest
from importer import import_feedback

st.set_page_config(
    page_title="User Feedback Synthesizer",
    page_icon="🧠",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Custom Styling that adapts to both Dark and Light themes
st.markdown(
    """
    <style>
    .status-badge {
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 0.85rem;
        font-weight: 600;
        display: inline-block;
    }
    .status-live {
        background-color: rgba(34, 197, 94, 0.2);
        color: #16a34a;
        border: 1px solid rgba(34, 197, 94, 0.4);
    }
    .status-offline {
        background-color: rgba(245, 158, 11, 0.2);
        color: #d97706;
        border: 1px solid rgba(245, 158, 11, 0.4);
    }
    .quote-box {
        border-left: 4px solid #3b82f6;
        padding: 10px 14px;
        margin: 8px 0;
        border-radius: 4px;
        background: rgba(59, 130, 246, 0.08);
    }
    </style>
    """,
    unsafe_allow_html=True,
)


@st.cache_resource
def get_client():
    return HindsightMemoryClient()


client = get_client()
banks = load_banks_config()

# Sidebar: Bank & System Config
st.sidebar.title("🧠 Hindsight Engine")

selected_bank_id = st.sidebar.selectbox(
    "Active Memory Bank:",
    options=list(banks.keys()),
    index=0,
    format_func=lambda x: f"{banks[x].name} ({x})",
)
bank_cfg = banks[selected_bank_id]

is_live = client.is_live()
if is_live:
    st.sidebar.markdown(
        '<span class="status-badge status-live">● Hindsight Server: ONLINE (:8888)</span>',
        unsafe_allow_html=True,
    )
else:
    st.sidebar.markdown(
        '<span class="status-badge status-offline">○ Hindsight: LOCAL EMBEDDED</span>',
        unsafe_allow_html=True,
    )
    st.sidebar.caption("Run `docker compose up -d` to switch to live Hindsight container.")

st.sidebar.markdown("---")
st.sidebar.subheader("Bank Configuration")
st.sidebar.markdown(f"**Product:** `{bank_cfg.product}`")
with st.sidebar.expander("Mission & Directives", expanded=False):
    st.markdown(f"**Mission:**\n_{bank_cfg.mission}_")
    st.markdown("**Directives:**")
    for d in bank_cfg.directives:
        st.markdown(f"- **{d.name}**: {d.content}")

with st.sidebar.expander("Disposition Parameters", expanded=False):
    st.write(f"• Skepticism: **{bank_cfg.disposition.skepticism}/5** (high skepticism)")
    st.write(f"• Agreeableness: **{bank_cfg.disposition.agreeableness}/5** (low agreeableness)")
    st.write(f"• Literalism: **{bank_cfg.disposition.literalism}/5** (strict grounding)")
    st.write(f"• Empathy: **{bank_cfg.disposition.empathy}/5** (analytical reporting)")

if st.sidebar.button("🔄 Sync Bank & Standing Models", use_container_width=True):
    with st.spinner("Configuring bank in memory engine..."):
        res = client.create_or_update_bank(bank_cfg)
        st.sidebar.success(f"Bank synced: {res.get('status')}")

# Header
col_title, col_btn = st.columns([3, 1])
with col_title:
    st.title("User Feedback Synthesizer")
    st.caption(f"Living, evidence-backed product intelligence powered by Hindsight memory for **{bank_cfg.name}**")

with col_btn:
    st.write("")
    if st.button("⚡ Re-Synthesize Themes", type="primary", use_container_width=True):
        with st.spinner("Running reflect() across mental models..."):
            generate_weekly_digest(bank_id=selected_bank_id)
            st.success("Synthesis complete!")
            st.rerun()

# Load stored feedback data
data_storage = client._load_storage()
raw_memories = data_storage.get("memories", {}).get(selected_bank_id, [])
mental_models = client.list_mental_models(selected_bank_id)

# Metrics Row
m_col1, m_col2, m_col3, m_col4 = st.columns(4)
with m_col1:
    st.metric("Total Feedback Items", len(raw_memories))
with m_col2:
    st.metric("Standing Mental Models", len(mental_models))
with m_col3:
    total_evidence = sum(m.get("evidence_count", 0) for m in mental_models)
    st.metric("Total Evidence Cited", total_evidence)
with m_col4:
    ratings = [int(m["metadata"].get("rating", 3)) for m in raw_memories if m.get("metadata", {}).get("rating")]
    avg_r = round(sum(ratings) / len(ratings), 1) if ratings else 0.0
    st.metric("Avg Customer Sentiment", f"{avg_r} / 5.0" if ratings else "N/A")

st.markdown("---")

# Main Navigation Tabs
tab_themes, tab_search, tab_ingest, tab_digest = st.tabs([
    "📊 Synthesized Themes & Drill-down",
    "🔍 Search Feedback (Recall)",
    "📥 Ingestion Pipeline",
    "📄 Weekly PM Digest",
])

# -------------------------------------------------------------
# TAB 1: THEMES & DRILL-DOWN
# -------------------------------------------------------------
with tab_themes:
    if not mental_models:
        st.info("No synthesis findings yet. Click below to load sample feedback and run synthesis.")
        if st.button("Load Sample Dataset & Run Initial Synthesis"):
            import_feedback(file_path=settings.data_dir / "sample_feedback.csv", bank_id=selected_bank_id)
            generate_weekly_digest(bank_id=selected_bank_id)
            st.rerun()
    else:
        col_list, col_detail = st.columns([1, 2])

        with col_list:
            st.subheader("Standing Themes")
            theme_options = {m["name"]: m for m in mental_models}
            selected_theme_name = st.radio(
                "Select Theme to Drill Down:",
                options=list(theme_options.keys()),
                index=0,
            )
            selected_theme = theme_options[selected_theme_name]

            st.caption(f"Selected: `{selected_theme['id']}`")
            for t_name, t_obj in theme_options.items():
                cnt = t_obj.get("evidence_count", 0)
                st.caption(f"• **{t_name}**: {cnt} citations")

        with col_detail:
            st.subheader(f"Theme: {selected_theme['name']}")
            st.markdown(f"**Query**: *\"{selected_theme['query']}\"*")
            st.markdown(f"**Evidence Citations**: `{selected_theme.get('evidence_count', 0)} sources cited`")

            # Observation text
            st.markdown("### Synthesized Observation")
            obs_text = selected_theme.get("observation", "No observation synthesized yet.")
            st.markdown(obs_text)

            # Temporal Trend Analysis
            st.markdown("### 📈 Trend & Timeline Indicator")
            theme_id_clean = selected_theme["id"].replace("-", "_")
            related_memories = [
                m for m in raw_memories
                if theme_id_clean in m.get("tags", [])
                or any(t in " ".join(m.get("tags", [])) for t in selected_theme.get("tags", []))
                or selected_theme["name"].lower().split()[0] in m.get("text", "").lower()
            ]

            if not related_memories:
                related_memories = raw_memories[:20]

            if related_memories:
                chart_rows = []
                for m in related_memories:
                    meta = m.get("metadata", {})
                    ts = m.get("timestamp", "")
                    rating_val = int(meta.get("rating", 3)) if meta.get("rating") else 3
                    ver = meta.get("app_version", "unknown")
                    chart_rows.append({
                        "timestamp": ts[:10] if ts else "2026-09",
                        "rating": rating_val,
                        "version": ver,
                        "source": meta.get("source", "Other"),
                    })

                df_chart = pd.DataFrame(chart_rows)
                df_chart["timestamp"] = pd.to_datetime(df_chart["timestamp"])
                df_chart = df_chart.sort_values("timestamp")

                t_col1, t_col2 = st.columns(2)
                with t_col1:
                    st.write("**Feedback Volume Over Time**")
                    time_counts = df_chart.groupby(df_chart["timestamp"].dt.to_period("W")).size()
                    time_counts.index = time_counts.index.astype(str)
                    st.bar_chart(time_counts)

                with t_col2:
                    st.write("**Average Rating by App Version**")
                    ver_ratings = df_chart.groupby("version")["rating"].mean()
                    st.bar_chart(ver_ratings)

            # Grounded Source Quotes Drill-down
            st.markdown("### 💬 Verified Customer Quotes")
            facts = selected_theme.get("evidence_facts", [])
            if facts:
                for idx, f in enumerate(facts[:6], 1):
                    with st.expander(f"Quote #{idx}: {f.get('text', '')[:75]}...", expanded=(idx <= 2)):
                        st.markdown(f'<div class="quote-box">"{f.get("text")}"</div>', unsafe_allow_html=True)
                        st.caption(f"Context / Attribution: {f.get('context', 'Grounded feedback record')}")
            else:
                st.caption("No individual facts loaded. Re-run synthesis to extract facts.")

# -------------------------------------------------------------
# TAB 2: SEARCH (RECALL)
# -------------------------------------------------------------
with tab_search:
    st.subheader("🔍 Free-Text Feedback Recall")
    st.markdown("Search across all ingested feedback using semantic and keyword ranking wrapped via `recall()`.")

    col_q, col_s_btn = st.columns([4, 1])
    with col_q:
        search_query = st.text_input(
            "Search Query:",
            value="checkout bugs",
            placeholder="e.g. checkout bugs, pricing complaints, dark mode contrast, OTP SMS",
        )
    with col_s_btn:
        st.write("")
        st.write("")
        run_search = st.button("Search Memory", type="primary", use_container_width=True)

    # Search Filters
    f_col1, f_col2, f_col3 = st.columns(3)
    with f_col1:
        sources_list = ["All"] + sorted(list({m.get("metadata", {}).get("source", "Unknown") for m in raw_memories}))
        filter_source = st.selectbox("Source Filter:", options=sources_list)
    with f_col2:
        filter_rating = st.select_slider("Rating Filter:", options=["All", 1, 2, 3, 4, 5], value="All")
    with f_col3:
        search_limit = st.slider("Result Limit:", min_value=5, max_value=50, value=15)

    if search_query:
        source_param = None if filter_source == "All" else filter_source
        min_r = int(filter_rating) if filter_rating != "All" else None
        max_r = int(filter_rating) if filter_rating != "All" else None

        recall_res = client.recall(
            bank_id=selected_bank_id,
            query=search_query,
            source_type=source_param,
            min_rating=min_r,
            max_rating=max_r,
            limit=search_limit,
        )
        results = getattr(recall_res, "results", []) or []

        st.markdown(f"**Found {len(results)} ranked matches in bank `{selected_bank_id}`:**")
        if not results:
            st.warning("No feedback items matched your query and filter criteria.")
        else:
            for idx, r in enumerate(results, 1):
                meta = r.metadata or {}
                user = meta.get("user_name", "Anonymous")
                source = meta.get("source", "Unknown")
                ver = meta.get("app_version", "N/A")
                rating = meta.get("rating", "3")
                title = meta.get("title", "")
                date_str = (r.occurred_start or "")[:10]

                with st.container(border=True):
                    st.markdown(f"**#{idx}. {title or r.text[:60]}** — *Rating: {rating}/5*")
                    st.write(f'"{r.text}"')
                    st.caption(f"👤 {user} | 📱 {source} | 🏷️ Version: `{ver}` | 📅 {date_str}")

# -------------------------------------------------------------
# TAB 3: INGESTION PIPELINE
# -------------------------------------------------------------
with tab_ingest:
    st.subheader("📥 Ingest Raw Feedback")
    st.markdown("Each review, ticket, or message becomes a grounded memory unit in Hindsight via `retain()`.")

    ingest_col1, ingest_col2 = st.columns(2)

    with ingest_col1:
        st.markdown("#### Batch File Upload (CSV / JSON)")
        uploaded_file = st.file_uploader("Upload feedback file:", type=["csv", "json"])
        if uploaded_file is not None:
            if st.button("Import Uploaded File", type="primary"):
                temp_path = settings.data_dir / f"upload_{uploaded_file.name}"
                with open(temp_path, "wb") as f:
                    f.write(uploaded_file.getbuffer())
                try:
                    with st.spinner("Retaining batch into Hindsight..."):
                        res = import_feedback(temp_path, bank_id=selected_bank_id)
                        st.success(f"Successfully retained {res['total_retained']} items into {selected_bank_id}!")
                        st.rerun()
                finally:
                    if temp_path.exists():
                        temp_path.unlink()

        st.markdown("---")
        if st.button("Re-Import 75 Synthetic Sample Records"):
            with st.spinner("Importing sample feedback..."):
                import_feedback(settings.data_dir / "sample_feedback.csv", bank_id=selected_bank_id)
                st.success("Sample data loaded!")
                st.rerun()

    with ingest_col2:
        st.markdown("#### Quick Feedback Submission")
        with st.form("quick_feedback_form"):
            new_title = st.text_input("Title / Subject:", value="Checkout payment timed out")
            new_content = st.text_area(
                "Feedback Body:",
                value="Tapping the complete purchase button resulted in an infinite spinner and 504 gateway timeout on v2.3.",
            )
            form_c1, form_c2, form_c3 = st.columns(3)
            with form_c1:
                new_source = st.selectbox("Source:", ["App Store", "Google Play", "Zendesk", "Intercom", "Discord", "NPS Survey"])
            with form_c2:
                new_rating = st.slider("Rating (1-5):", min_value=1, max_value=5, value=1)
            with form_c3:
                new_version = st.text_input("Version:", value="v2.3")

            submitted = st.form_submit_button("Retain Single Feedback")
            if submitted:
                client.retain(
                    bank_id=selected_bank_id,
                    content=new_content,
                    metadata={
                        "source": new_source,
                        "rating": str(new_rating),
                        "title": new_title,
                        "app_version": new_version,
                        "user_name": "Web Form Submitter",
                    },
                    tags=[f"source:{new_source.lower().replace(' ', '_')}", f"rating:{new_rating}", f"version:{new_version}"],
                )
                st.success("Item successfully retained in Hindsight!")
                st.rerun()

# -------------------------------------------------------------
# TAB 4: WEEKLY PM DIGEST
# -------------------------------------------------------------
with tab_digest:
    st.subheader("📄 Weekly Executive Digest")
    st.markdown("Auto-generated via `reflect()` across fixed mental models, suitable for emailing to PM/Engineering teams.")

    md_file = settings.output_dir / "digest.md"
    html_file = settings.output_dir / "digest.html"

    if md_file.exists():
        with open(md_file, "r", encoding="utf-8") as f:
            digest_md = f.read()

        d_col1, d_col2 = st.columns(2)
        with d_col1:
            st.download_button(
                "⬇️ Download Markdown Report (.md)",
                data=digest_md,
                file_name=f"feedback_digest_{selected_bank_id}.md",
                mime="text/markdown",
            )
        with d_col2:
            if html_file.exists():
                with open(html_file, "r", encoding="utf-8") as f:
                    html_data = f.read()
                st.download_button(
                    "⬇️ Download HTML Report (.html)",
                    data=html_data,
                    file_name=f"feedback_digest_{selected_bank_id}.html",
                    mime="text/html",
                )

        st.markdown("---")
        st.markdown(digest_md)
    else:
        st.warning("No digest found. Click '⚡ Re-Synthesize Themes' in the top bar to generate the weekly digest.")
