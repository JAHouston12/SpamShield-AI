/**
 * Canonical project content. Every page reads from here so the research framing stays consistent and
 * can be edited in one place.
 */

export const PROJECT = {
  title: "SpamShield AI",
  topic: "Spam Detection Using Machine Learning",
  dataset: "SMS Spam Collection Dataset",
  objective:
    "Develop and evaluate machine learning models capable of classifying SMS messages as spam or legitimate and determine whether advanced models outperform a baseline model.",
  researchQuestion:
    "Can machine learning techniques improve spam detection accuracy compared to a baseline classification model?",
  securityProblem:
    "Spam messages continue to threaten users through scams, phishing attempts, malicious links, and unwanted content. Machine learning can automate classification and improve communication security.",
  hypothesis:
    "An ensemble model (Random Forest) will reduce false positives and improve spam identification compared with a Logistic Regression baseline trained on identical TF-IDF features.",
  baseline: { key: "logistic_regression", name: "Logistic Regression" },
  improved: { key: "random_forest", name: "Random Forest" },
  futureModels: [
    "Naive Bayes",
    "Decision Tree",
    "KNN",
    "SVM",
    "AdaBoost",
    "Gradient Boosting",
    "XGBoost",
    "MLP Neural Network",
  ],
  metrics: ["Accuracy", "Precision", "Recall", "F1 Score", "ROC-AUC"],
  statedFinding:
    "Random Forest improves spam classification performance, reduces false positives, and improves spam identification rates.",
  futureWork: [
    "Compare additional machine learning models",
    "Evaluate deep learning approaches",
    "Compare against transformer-based language models",
    "Investigate hybrid security detection methods",
  ],
} as const;

export const OBJECTIVES = [
  {
    title: "Build a reproducible pipeline",
    body: "Load, clean, deduplicate, and vectorize the SMS Spam Collection with TF-IDF and engineered message features.",
  },
  {
    title: "Establish a baseline",
    body: "Train Logistic Regression as the reference classifier on identical features and a stratified hold-out split.",
  },
  {
    title: "Evaluate advanced models",
    body: "Train Random Forest plus eight further classifiers and compare them on accuracy, precision, recall, F1, and ROC-AUC.",
  },
  {
    title: "Interpret security impact",
    body: "Translate false positives and false negatives into operational risk: lost messages versus phishing exposure.",
  },
  {
    title: "Explain decisions",
    body: "Expose feature importance and SHAP-style attributions so analysts can audit why a message was flagged.",
  },
  {
    title: "Ship a usable detector",
    body: "Serve the trained models through a FastAPI endpoint and an interactive live detector.",
  },
];

export const TECH_STACK = [
  { group: "Frontend", items: ["Next.js 14 (App Router)", "TypeScript", "Tailwind CSS", "shadcn/ui", "Recharts"] },
  { group: "Backend", items: ["Python 3.12", "FastAPI", "Pydantic v2", "Uvicorn"] },
  { group: "Machine learning", items: ["scikit-learn", "XGBoost", "TF-IDF (1–2 grams)", "chi² feature selection"] },
  { group: "Tooling", items: ["uv", "pytest", "Ruff", "Docker Compose"] },
];

export const METHODOLOGY = [
  { step: "Acquire", detail: "Use the SMS Spam Collection Dataset from Kaggle (spam.csv, 5,572 labeled messages)." },
  { step: "Explore", detail: "Profile class balance, message length, vocabulary, duplicates, and feature correlations." },
  { step: "Preprocess", detail: "Deduplicate, normalize text, mask URLs/numbers, TF-IDF vectorize, scale, select features." },
  { step: "Train", detail: "Fit ten classifiers on an 80/20 stratified split with class-imbalance handling." },
  { step: "Calibrate", detail: "Choose each model's decision threshold from 5-fold out-of-fold training predictions." },
  { step: "Evaluate", detail: "Score on the untouched test set and compare against the Logistic Regression baseline." },
  { step: "Interpret", detail: "Analyze errors through a security lens and explain predictions with feature attributions." },
];

export const REFERENCES = [
  "Almeida, T. A., Gómez Hidalgo, J. M., & Yamakami, A. (2011). Contributions to the study of SMS spam filtering: New collection and results. Proceedings of the 11th ACM Symposium on Document Engineering, 259–262.",
  "UCI Machine Learning. (2016). SMS Spam Collection Dataset [Data set]. Kaggle. https://www.kaggle.com/datasets/uciml/sms-spam-collection-dataset",
  "Pedregosa, F., et al. (2011). Scikit-learn: Machine learning in Python. Journal of Machine Learning Research, 12, 2825–2830.",
  "Chen, T., & Guestrin, C. (2016). XGBoost: A scalable tree boosting system. Proceedings of KDD '16, 785–794.",
  "Breiman, L. (2001). Random forests. Machine Learning, 45(1), 5–32.",
  "Lundberg, S. M., & Lee, S.-I. (2017). A unified approach to interpreting model predictions. Advances in NeurIPS 30.",
  "Salton, G., & Buckley, C. (1988). Term-weighting approaches in automatic text retrieval. Information Processing & Management, 24(5), 513–523.",
  "Federal Trade Commission. (2024). Consumer Sentinel Network Data Book. https://www.ftc.gov/",
];
