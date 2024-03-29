import { currentUser } from "@clerk/nextjs";
import { redirect } from "next/navigation";

import AccountProfile from "@/components/forms/AccountProfile";
import { fetchUser } from "@/lib/actions/user.actions";

interface UserInfo {
  _id?: string;
  username?: string;
  name?: string;
  bio?: string;
  image?: string;
  onboarded?: boolean;
}

const Page = async () => {
  const user = await currentUser();
  if (!user) return null;

  const userInfo: UserInfo = await fetchUser(user.id);
  if (userInfo?.onboarded) redirect("/");

  const userData = {
    id: user?.id || "",
    objectId: userInfo?._id || "",
    username: (userInfo ? userInfo?.username : user?.username) || "",
    name: userInfo?.name || user?.firstName || "",
    bio: userInfo?.bio || "",
    image: userInfo?.image || user?.imageUrl || "",
  };

  return (
    <main className="flex flex-col mx-auto max-w-3xl justify-start px-10 py-20">
      <h1 className="head-text">Onboarding</h1>
      <p className="mt-3 text-base-regular text-light-2">
        Complete your profile now to use Threads
      </p>
      <section className="bg-dark-2 mt-9 p-10">
        <AccountProfile user={userData} btnTitle="Continue" />
      </section>
    </main>
  );
};

export default Page;
