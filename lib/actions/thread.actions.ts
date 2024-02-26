"use server";

import { revalidatePath } from "next/cache";
import { connectToDB } from "../db";
import Thread from "../models/thread.model";
import User from "../models/user.model";
import Community from "../models/community.model";

interface CreateThreadParams {
  text: string;
  author: string;
  communityId: string | null;
  path: string;
}

interface addCommentToThreadParams {
  threadId: string;
  commentText: string;
  userId: string;
  path: string;
}

export const fetchThreads = async (pageNumber = 1, pageSize = 20) => {
  connectToDB();

  try {
    // calculate the number of threads to skip
    const skipAmount = (pageNumber - 1) * pageSize;

    const threadsQuery = Thread.find({ parentId: { $in: [null, undefined] } })
      .sort({ createdAt: "desc" })
      .skip(skipAmount)
      .limit(pageSize)
      .populate({ path: "author", model: User })
      .populate({
        path: "children",
        populate: {
          path: "author",
          model: User,
          select: "_id name parentId image",
        },
      })
      .populate({
        path: "community",
        model: Community,
        select: "id name image",
      });

    const totalThreadsCount = await Thread.countDocuments({
      parentId: { $in: [null, undefined] },
    });

    const threads = await threadsQuery.exec();

    const isNext = totalThreadsCount > skipAmount + threads.length;

    return { threads, isNext };
  } catch (error: any) {
    throw new Error(`Failed to fetch threads: ${error.message}`);
  }
};

export const fetchThreadById = async (id: string) => {
  connectToDB();

  try {
    // TODO: Populate Community
    const thread = await Thread.findById(id)
      .populate({
        path: "author",
        model: User,
        select: "_id id name image",
      })
      .populate({
        path: "children",
        populate: [
          {
            path: "author",
            model: User,
            select: "_id id name parentId image",
          },
          {
            path: "children",
            model: Thread,
            populate: {
              path: "author",
              model: User,
              select: "_id id name parentId image",
            },
          },
        ],
      })
      .populate({
        path: "community",
        model: Community,
        select: "id name image",
      })
      .exec();

    return thread;
  } catch (error: any) {
    throw new Error(`Failed to fetch thread by Id: ${error.message}`);
  }
};

export const createThread = async ({
  text,
  author,
  communityId,
  path,
}: CreateThreadParams) => {
  connectToDB();

  try {
    const communityIdObject = await Community.findOne(
      { id: communityId },
      { _id: 1 }
    );

    const createdThread = await Thread.create({
      text,
      author,
      community: communityIdObject,
    });

    // Update User Model
    await User.findByIdAndUpdate(author, {
      $push: { threads: createdThread._id },
    });

    if (communityIdObject) {
      // Update Community Model
      await Community.findByIdAndUpdate(communityIdObject, {
        $push: { threads: createdThread._id },
      });
    }

    revalidatePath(path);
  } catch (error: any) {
    throw new Error(`Failed to create thread: ${error.message}`);
  }
};

export const addCommentToThread = async ({
  threadId,
  commentText,
  userId,
  path,
}: addCommentToThreadParams) => {
  connectToDB();

  try {
    // Find original thread by its ID
    const originalThread = await Thread.findById(threadId);
    if (!originalThread) throw new Error(`Thread not found`);

    // Create a new thread with the comment text
    const commentThread = new Thread({
      text: commentText,
      author: userId,
      parentId: threadId,
    });

    // Save the new thread
    const savedCommentThread = await commentThread.save();

    // Add comment to original thread
    originalThread.children.push(savedCommentThread._id);

    // Save the original thread
    await originalThread.save();

    revalidatePath(path);
  } catch (error: any) {
    throw new Error(`Failed to add comment to thread: ${error.message}`);
  }
};
