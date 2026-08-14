import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { readPage } from "./pageTestUtils";

describe("core page contracts", () => {
  it("contact page keeps metadata title and support email link", () => {
    const source = readPage("contact.vue");
    expect(source).toContain("title: 'Contact · Lonely Radish'");
    expect(source).toContain("How can we help?");
    expect(source).toContain("mailto:contact@lonelyradish.app");
    expect(source).toContain("We usually reply within a few days.");
  });

  it("privacy notice page keeps metadata title and heading copy", () => {
    const source = readPage("privacy-notice.vue");
    expect(source).toContain("title: 'Privacy Notice · Lonely Radish'");
    expect(source).toContain("Privacy Notice");
    expect(source).toContain("Last updated:");
  });

  it("home page keeps SEO metadata and activity-date call to action", () => {
    const source = readPage("index.vue");
    expect(source).toContain("Meet someone new");
    expect(source).toContain('class="hero-gradient-text"');
    expect(source).toContain("navigateTo('/activities')");
    expect(source).toContain('to="/matches"');
    expect(source).toContain("'Good morning'");
    expect(source).toContain("'Good afternoon'");
    expect(source).toContain("'Good evening'");
    expect(source).toContain("Nice to see you tonight");
    expect(source).toContain("Welcome back, night owl");
    expect(source).toContain("firstName.charAt(0).toLocaleUpperCase()");
    expect(source).toContain("welcomeMessages");
    expect(source).toContain(
      "Fancy making a plan with someone new?",
    );
    expect(source).toContain(
      "Spend less time swiping and more time seeing if you click.",
    );
    expect(source).toContain("Zero algorithms used — no ranking, paid boosts or pay-to-be-seen");
    expect(source).toContain("Why it works this way");
    expect(source).toContain("Choose who you’re actually curious about");
    expect(source).toContain("Keep room for a real conversation");
    expect(source).toContain("A plan is only a plan when you both say yes");
    expect(source).toContain("When you find someone");
    expect(source).toContain("name: 'Theo'");
    expect(source).toContain("photo: '/images/theo-profile-triptych.png'");
    expect(source).toContain("name: 'Amina'");
    expect(source).toContain("photo: '/images/amina-profile-triptych.png'");
    expect(source).toContain("name: 'Ravi'");
    expect(source).toContain("photo: '/images/ravi-profile-triptych.png'");
    expect(source).toContain("name: 'Jordan'");
    expect(source).toContain("photo: '/images/jordan-profile-triptych.png'");
    expect(source).toContain("Illustrative profile examples");
    expect(source).toContain("/images/home-canal-date.webp");
    expect(source).toContain("/images/home-pottery-date.webp");
    expect(source).toContain("/images/home-cafe-date.webp");
    expect(source).not.toContain("name: 'Alex'");
    expect(source).toContain("text-[#2A1520] sm:text-6xl");
    expect(source).toContain("user.value?.firstName");
    expect(source).toContain("user.value?.firstName");
    expect(source).toContain("from Lonely Radish");
  });

  it("mock activity and match pages are routed separately from the preview page", () => {
    const activities = readPage("activities/index.vue");
    const activityMatches = readPage("activities/[slug].vue");
    const profile = readPage("profiles/[slug].vue");
    const profileActivityPanel = readFileSync(
      resolve(process.cwd(), "components/ProfileActivityPanel.vue"),
      "utf8",
    );
    const availabilityCard = readFileSync(
      resolve(process.cwd(), "components/ProfileAvailabilityContactCard.vue"),
      "utf8",
    );
    const plan = readPage("plans/[slug].vue");
    const matches = readPage("matches/index.vue");
    const nav = readFileSync(
      resolve(process.cwd(), "components/BlankNavBar.vue"),
      "utf8",
    );

    expect(activities).toContain("title: 'Discover by activity · Lonely Radish'");
    expect(activities).toContain("Who would you enjoy meeting?");
    expect(activities).toContain("slug: 'sports'");
    expect(activities).toContain("slug: 'games'");
    expect(activities).toContain("Activity filters");
    expect(activities).toContain("selectedCategories.includes(category.slug)");
    expect(activities).toContain("'/api/activities/people'");
    expect(activities).toContain("Nobody here fits these filters yet");
    expect(activities).toContain("appliedFilters.orientationLabel");
    expect(activities).toContain("All ethnicities");
    expect(activities).toContain("`/profiles/${person.slug}`");
    expect(activities).toContain(':key="person.slug"');
    expect(activityMatches).toContain("path: '/activities'");
    expect(activityMatches).toContain("categories: category");
    expect(profile).toContain(
      "`${profile.value.name}'s Profile · Lonely Radish`",
    );
    expect(profile).toContain("About me");
    expect(profileActivityPanel).toContain("Activities I’d enjoy together");
    expect(profile).toContain("/images/maya-profile-triptych.png");
    expect(profile).toContain("/images/nina-profile-triptych.png");
    expect(profile).toContain("/images/alex-profile-triptych.png");
    expect(profile).toContain("/images/maya-profile-triptych-2.png");
    expect(profile).toContain("galleryPhotos");
    expect(profile).toContain(".slice(0, 6)");
    expect(profile).toContain("pronouns: 'they/them'");
    expect(profile).toContain("genderIdentity: 'neither'");
    expect(profile).toContain('genderIdentityLabel(profile.genderIdentity)');
    expect(profile).toContain("'Show interest'");
    expect(profile).toContain("Already matched with ${profile.name}");
    expect(profile).toContain("Unmatched from ${profile.name}");
    expect(profile).toContain(':flipped="activitiesFlipped"');
    expect(profile).toContain("@toggle=\"activitiesFlipped = !activitiesFlipped\"");
    expect(profile).toContain(`profile.relationshipStatus !== 'unmatched'`);
    expect(profile).toContain("Past connection");
    expect(profile).toContain("route.query.connection !== 'past'");
    expect(profile).toContain("hasSharedContactDetails");
    expect(profile).toContain("availabilityContactFlipped");
    expect(availabilityCard).toContain("Show shared contact details");
    expect(profile).toContain("profileInterests");
    expect(profileActivityPanel).toContain(".profile-flip-card:hover");
    expect(profile).toContain("useDailyInterest()");
    expect(activities).not.toContain("useDailyInterest()");
    expect(activities).toContain(':to="`/profiles/${person.slug}`"');
    expect(matches).toContain("title: 'Matches & Plans · Lonely Radish'");
    expect(matches).toContain("What would you like to do next?");
    expect(matches).toContain("title: 'Reply to a plan'");
    expect(matches).toContain("title: 'Make a plan'");
    expect(matches).toContain("title: 'Upcoming dates'");
    expect(matches).toContain("`/profiles/${match.slug}`");
    expect(matches).toContain("View {{ match.name }}’s profile");
    expect(plan).toContain("Plan a date with {{ personName }}");
    expect(plan).toContain("Suggest a date and time");
    expect(plan).toContain("Choose where to meet");
    expect(plan).not.toContain("Keep logistics simple");
    expect(plan).toContain("Short reply");
    expect(plan).not.toContain("Add preset");
    expect(plan).not.toContain("removeQuickMessage");
    expect(plan).not.toContain("lonely-radish-planning-quick-messages");
    expect(plan).toContain("interestsByPerson");
    expect(plan).toContain("2. Add a note");
    expect(plan).toContain("inviteMessageLimit = 240");
    expect(nav).toContain("to: '/activities'");
    expect(nav).toContain("to: '/matches'");
    expect(nav).toContain("label: 'Browse date activities'");
    expect(nav).toContain("label: 'Matches & plans'");
  });

  it("provides a private preview of the signed-in users real profile", () => {
    const preview = readPage("profile/preview.vue");
    const profileActivityPanel = readFileSync(
      resolve(process.cwd(), "components/ProfileActivityPanel.vue"),
      "utf8",
    );
    const availabilityCard = readFileSync(
      resolve(process.cwd(), "components/ProfileAvailabilityContactCard.vue"),
      "utf8",
    );
    const nav = readFileSync(
      resolve(process.cwd(), "components/BlankNavBar.vue"),
      "utf8",
    );
    expect(preview).toContain("middleware: 'logged-in'");
    expect(preview).toContain("'/api/profile/me'");
    expect(preview).toContain("Saved contact details are previewed below");
    expect(preview).toContain("preferences are never included");
    expect(preview).toContain("gallerySlots");
    expect(preview).toContain('class="order-1 min-w-0 max-w-full sm:hidden"');
    expect(preview).toContain("Tap to expand");
    expect(preview).toContain("overflow-x-auto overscroll-x-contain");
    expect(preview).toContain('aria-label="Expanded profile photo"');
    expect(preview).toContain("endPhotoSwipe");
    expect(preview).toContain("lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]");
    expect(preview).toContain("profileCardFlipped && 'is-flipped'");
    expect(profileActivityPanel).toContain("Activities I’d enjoy together");
    expect(preview).toContain(':flipped="activitiesFlipped"');
    expect(profileActivityPanel).toContain("My personal interests");
    expect(profileActivityPanel).toContain(".profile-flip-card:hover");
    expect(preview).toContain("prefers-reduced-motion: reduce");
    expect(preview).toContain(
      "Preview only — these controls are not active here.",
    );
    expect(preview).toContain("Report profile");
    expect(availabilityCard).toContain("Show saved contact details");
    expect(availabilityCard).toContain("Preview only — these saved details are currently hidden from matches.");
    expect(preview).not.toContain(
      "People see your selected interests when they discover you",
    );
    expect(nav).toContain('to="/profile/preview"');
    expect(
      readFileSync(
        resolve(process.cwd(), "server/api/profile/me.get.ts"),
        "utf8",
      ),
    ).toContain("activities: activities.rows.map");
    expect(
      readFileSync(
        resolve(process.cwd(), "server/api/profile/me.get.ts"),
        "utf8",
      ),
    ).toContain("interestCategories:");
    expect(
      readFileSync(
        resolve(process.cwd(), "server/api/profile/me.get.ts"),
        "utf8",
      ),
    ).toContain("personalInterests:");
  });
});
