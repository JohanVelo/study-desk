/* Study Desk — starting content
   ---------------------------------------------------------------------
   Empty on purpose: everyone starts with a clean slate and adds their own
   subjects in the app (Subjects → Import a file, or Add a subject).
   Content can still be shipped here for a specific person; nothing else needs to change.

   Shape:  subject → chapter → heading → subheading (any depth works).
   Each node: [title, firstPage, lastPage, difficulty 1-3, children | startingStatus, {calc:1}?]
   Status ladder: 0 Not started · 1 Learning · 2 Understood · 3 Practised · 4 Revised · 5 Mastered
   Exams: use  exam:"2026-11-02"  (real date) or  examInDays:10  (prototype, relative to first launch).
   Topic ids are built from titles, so progress survives reordering. Renaming a title resets that topic.
   The app checks this file on start-up and lists any problems under Settings → Data check.
*/
window.STUDY_DATA = {
  contentVersion: "start-1",   /* change this whenever the content below changes, so installed apps load it */
  subjects: [],
  questions: [],
  history: {},
  mistakes: {},
  explain: {},
  notes: {}
};
