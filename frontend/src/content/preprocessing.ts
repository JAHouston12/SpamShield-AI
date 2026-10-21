export interface PreprocessingStep {
  id: "missing" | "duplicates" | "cleaning" | "tfidf" | "scaling" | "selection" | "imbalance" | "split";
  title: string;
  what: string;
  why: string;
  how: string;
}

export const PREPROCESSING_STEPS: PreprocessingStep[] = [
  {
    id: "missing",
    title: "Handling missing values",
    what: "Rejoin message fragments from the Kaggle CSV's three near-empty overflow columns, repair mis-encoded characters, drop rows missing a label or text, and normalize labels to lowercase ham / spam.",
    why: "The overflow columns are 'missing' only because commas inside a message split it across columns. Dropping them would silently truncate those messages, and garbled characters like “å£” hide the “£” money signal.",
    how: "Guarantees every training row is a complete, correctly encoded (text, label) pair, so no model learns from truncated text or crashes on NaN input.",
  },
  {
    id: "duplicates",
    title: "Removing duplicates",
    what: "Drop exact duplicate messages before splitting, keeping the first occurrence.",
    why: "Bulk spam campaigns and stock replies (“Sorry, I'll call later”) repeat verbatim. If copies fall on both sides of the split, the model is tested on messages it memorized.",
    how: "Prevents train/test leakage, so reported scores reflect generalization to unseen messages rather than recall of templates.",
  },
  {
    id: "cleaning",
    title: "Text cleaning",
    what: "Decode HTML entities, lowercase, mask URLs, emails, phone numbers, currency, and numbers with placeholder tokens, strip punctuation, and remove stop words.",
    why: "“£1000”, “£500” and “$250” are different strings but the same threat signal. Raw text fragments the vocabulary into thousands of rare tokens.",
    how: "Collapses variants into shared, learnable indicators (<PHONE>, <CURRENCY>), shrinks vocabulary, and makes the model robust to spammers rotating numbers and links.",
  },
  {
    id: "tfidf",
    title: "TF-IDF vectorization",
    what: "Convert cleaned text into unigram and bigram TF-IDF vectors (min_df = 2, max_df = 0.95, sublinear TF, max 6,000 terms).",
    why: "Models need numeric input. Raw counts over-reward common words, while TF-IDF up-weights terms that are frequent in a message but rare across the corpus.",
    how: "Highlights distinctive phrases like “claim prize” and “txt stop” while down-weighting filler. Bigrams capture short context that single words miss.",
  },
  {
    id: "scaling",
    title: "Feature scaling",
    what: "Scale the eight engineered numeric features to [0, 1] with MinMaxScaler (clipping unseen extremes). TF-IDF rows are already L2-normalized.",
    why: "Message length ranges into the hundreds while has_url is 0 or 1. Distance- and gradient-based models (KNN, SVM, Logistic Regression, MLP) would otherwise be dominated by large-magnitude features.",
    how: "Puts engineered and text features on comparable scales, speeds up convergence, and keeps values non-negative so Naive Bayes and chi² remain valid.",
  },
  {
    id: "selection",
    title: "Feature selection",
    what: "Rank all TF-IDF and engineered features with the chi² test against the label and keep the top 3,000.",
    why: "Most n-grams appear only a handful of times and carry no signal. High-dimensional sparse noise slows training and invites overfitting, especially for trees and KNN.",
    how: "Removes roughly half the features with negligible accuracy cost, reduces training time and memory, and focuses models on statistically discriminative cues.",
  },
  {
    id: "imbalance",
    title: "Handling class imbalance",
    what: "Apply class weights (balanced / balanced_subsample), XGBoost scale_pos_weight, and per-model decision thresholds tuned on out-of-fold training predictions.",
    why: "With roughly 7 ham messages per spam, a model can minimize loss by under-predicting spam. That is exactly the error that lets phishing through.",
    how: "Raises the cost of missing spam during training and calibrates each model's cut-off for the best F1, improving recall without inflating false positives. No synthetic samples are generated, so no artificial text leaks into evaluation.",
  },
  {
    id: "split",
    title: "Train / test splitting",
    what: "Stratified 80 / 20 split with a fixed random seed (42). All fitting, threshold tuning and cross-validation happen on the training portion only.",
    why: "A model must be scored on data it never saw. Stratification keeps the 13% spam share identical in both sets so metrics are comparable and stable.",
    how: "Produces an unbiased hold-out estimate of real-world performance and a fair, reproducible comparison between all ten models.",
  },
];
