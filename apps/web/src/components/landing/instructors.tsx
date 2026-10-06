import { getLandingMessages } from '@/i18n/server';
import { getInstructors } from '@/lib/landing-data';
import { LandingSection } from './landing-section';
import { PersonAvatar } from './person-avatar';

/** Renders nothing when there are no instructors yet. */
export async function Instructors() {
  const [{ t }, instructors] = await Promise.all([getLandingMessages(), getInstructors()]);
  if (instructors.length === 0) return null;

  return (
    <LandingSection
      id="instructors"
      eyebrow={t.instructors.eyebrow}
      title={t.instructors.title}
      intro={t.instructors.intro}
    >
      <ul className="flex flex-wrap justify-center gap-6">
        {instructors.map((person) => {
          const name = `${person.firstName} ${person.lastName}`;
          return (
            <li
              key={person.id}
              className="reveal flex w-full flex-col items-center rounded-xl border bg-white p-6 text-center sm:w-72"
            >
              <PersonAvatar name={name} src={person.avatarUrl} size={96} />
              <h3 className="mt-4 font-semibold text-slate-900">{name}</h3>
              <p className="text-primary text-sm font-medium">
                {person.title ?? t.instructors.fallbackRole}
              </p>
              {person.bio && <p className="mt-3 text-sm leading-6 text-slate-600">{person.bio}</p>}
            </li>
          );
        })}
      </ul>
    </LandingSection>
  );
}
