# Fake News Detection

The app includes a local screening workflow for article text and OCR output. The Kaggle dataset is kept as a server-side labeled reference corpus, not bundled into the browser.

## Import the Kaggle dataset

Download `Fake.csv` and `True.csv` from the [Fake and Real News Dataset](https://www.kaggle.com/datasets/clmentbisaillon/fake-and-real-news-dataset) and place both files in `data/fake-and-real-news-dataset/`.

Apply the Supabase migration, then run the importer with a service-role key in your terminal. Never put that key in `.env` variables beginning with `VITE_`.

```powershell
$env:SUPABASE_URL = "https://your-project.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "your-service-role-key"
bun run dataset:import -- --dir data/fake-and-real-news-dataset
```

The importer is safe to rerun: rows are upserted by dataset name and source row, and the full CSV is not committed to the repository. The dataset provides labeled training and evaluation examples; it does not by itself make predictions about new articles. The current app continues to use its transparent heuristic screening result until a separately trained classifier is deployed behind an authenticated server function.



