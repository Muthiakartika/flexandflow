/**
 * Nothing, deliberately.
 *
 * `loading.tsx` cascades to every segment below it, so without this file the
 * login page would flash the agenda's skeleton — a table and a row of takings
 * shown to somebody who is not signed in. There is nothing here worth drawing
 * a shape for either: the page is one form, and it renders as fast as the
 * cookie check in front of it.
 */
export default function Loading() {
  return null;
}
