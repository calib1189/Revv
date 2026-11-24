/** Where "get your score" should land someone, given their cars (newest
 * first): straight into the score reveal on an unscored car with a
 * photo, else to adding a photo, else to the score they already have.
 * Behind the /score link and the "rate your car" push. */
export function scoreLink(cars: { id: string; hasPhoto: boolean; rated: boolean }[]): string {
  if (cars.length === 0) return "/garage/new";
  const unscored = cars.filter((c) => !c.rated);
  if (unscored.length === 0) return `/garage/${cars[0].id}#rate`;
  const ready = unscored.find((c) => c.hasPhoto);
  if (ready) return `/garage/${ready.id}?score=1`;
  return `/garage/${unscored[0].id}#manage`;
}
