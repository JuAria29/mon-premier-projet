export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8 text-slate-900">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-slate-500">Aria Coach</p>
              <h1 className="mt-3 text-3xl font-semibold text-slate-900">Dashboard matin</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Un aperçu rapide de vos priorités, rendez-vous et actions importantes du jour.
              </p>
            </div>
            <div className="rounded-3xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
              Session : matin
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-900">Tâches clés</h2>
                <span className="text-sm text-slate-500">3 items</span>
              </div>
              <ul className="mt-5 space-y-4 text-sm text-slate-700">
                <li className="rounded-2xl bg-slate-50 p-4">Analyser les mails prioritaires et proposer un brouillon de réponse.</li>
                <li className="rounded-2xl bg-slate-50 p-4">Lire les notes OneNote et extraire les actions urgentes.</li>
                <li className="rounded-2xl bg-slate-50 p-4">Classer les tâches en fonction de l’impact stratégique.</li>
              </ul>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">Résumé</h2>
              <p className="mt-4 text-sm leading-6 text-slate-600">
                Cette version initiale prépare la base pour un coach stratégique connecté : objectifs, inbox et actions quotidiennes.
              </p>
            </article>
          </div>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Statut du jour</h3>
              <div className="mt-5 space-y-4 text-sm text-slate-700">
                <div className="rounded-2xl bg-slate-50 p-4">Tâches prévues : 5</div>
                <div className="rounded-2xl bg-slate-50 p-4">RDV confirmés : 2</div>
                <div className="rounded-2xl bg-slate-50 p-4">Actions en attente : 1</div>
              </div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600 shadow-sm">
              <p className="font-semibold text-slate-900">Prochaine étape</p>
              <p className="mt-3">Installer Microsoft Graph, configurer Supabase et démarrer l’authentification.</p>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
