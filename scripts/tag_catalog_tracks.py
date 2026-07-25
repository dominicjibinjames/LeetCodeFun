"""Enrich catalog.json with beginner/experienced track tags."""
from __future__ import annotations

import json
from pathlib import Path

CATALOG = Path(r"d:\Personal_Projects\LeetCodeFun\data\problems\catalog.json")

BEGINNER = {
    # Easy
    "Contains Duplicate",
    "Two Sum",
    "Find All Numbers Disappeared in an Array",
    "Missing Number",
    "Majority Element",
    "Move Zeroes",
    "Squares of a Sorted Array",
    "Backspace String Compare",
    "Maximum Average Subarray I",
    "Is Subsequence",
    "Reverse Linked List",
    "Middle of the Linked List",
    "Linked List Cycle",
    "Merge Two Sorted Lists",
    "Remove Linked List Elements",
    "Remove Duplicates from Sorted List",
    "Palindrome Linked List",
    "Binary Search",
    "Find Smallest Letter Greater Than Target",
    "Maximum Depth of Binary Tree",
    "Minimum Depth of Binary Tree",
    "Same Tree",
    "Invert Binary Tree",
    "Path Sum",
    "Subtree of Another Tree",
    "Binary Tree Paths",
    "Merge Two Binary Trees",
    "Average of Levels in Binary Tree",
    "Meeting Rooms",
    "Convert 1D Array Into 2D Array",
    "Range Sum Query - Immutable",
    # Medium
    "Product of Array Except Self",
    "Find All Duplicates in an Array",
    "3Sum",
    "3Sum Closest",
    "Container With Most Water",
    "Sort Colors",
    "Longest Substring Without Repeating Characters",
    "Minimum Size Subarray Sum",
    "Longest Repeating Character Replacement",
    "Permutation in String",
    "Fruit Into Baskets",
    "Subarray Product Less Than K",
    "Remove Nth Node From End of List",
    "Peak Index in a Mountain Array",
    "Search in Rotated Sorted Array",
    "Find Minimum in Rotated Sorted Array",
    "Search a 2D Matrix",
    "Find Peak Element",
    "Binary Tree Level Order Traversal",
    "Validate Binary Search Tree",
    "Merge Intervals",
    "Insert Interval",
    "Non-overlapping Intervals",
    "Interval List Intersections",
    "Number of Islands",
    "Pacific Atlantic Water Flow",
    "Graph Valid Tree",
    "Number of Connected Components in an Undirected Graph",
    "Course Schedule",
    "Kth Largest Element in an Array",
    "Top K Frequent Elements",
    "K Closest Points to Origin",
    "Meeting Rooms II",
    "Kth Smallest Element in a Sorted Matrix",
    "Set Matrix Zeroes",
    "Spiral Matrix",
    "Rotate Image",
}

EXPERIENCED = {
    # Easy
    "Two Sum",
    "Contains Duplicate",
    "Valid Anagram",
    "Valid Palindrome",
    "Best Time to Buy and Sell Stock",
    "Valid Parentheses",
    "Reverse Linked List",
    "Merge Two Sorted Lists",
    "Linked List Cycle",
    "Invert Binary Tree",
    "Maximum Depth of Binary Tree",
    "Same Tree",
    "Subtree of Another Tree",
    "Climbing Stairs",
    "Meeting Rooms",
    "Number of 1 Bits",
    "Counting Bits",
    "Reverse Bits",
    "Missing Number",
    # Medium
    "Group Anagrams",
    "Encode and Decode Strings",
    "Product of Array Except Self",
    "Longest Consecutive Sequence",
    "3Sum",
    "Container With Most Water",
    "Longest Substring Without Repeating Characters",
    "Longest Repeating Character Replacement",
    "Search in Rotated Sorted Array",
    "Find Minimum in Rotated Sorted Array",
    "Reorder List",
    "Remove Nth Node From End of List",
    "Lowest Common Ancestor of a Binary Search Tree",
    "Binary Tree Level Order Traversal",
    "Validate Binary Search Tree",
    "Kth Smallest Element in a BST",
    "Construct Binary Tree from Preorder and Inorder Traversal",
    "Implement Trie (Prefix Tree)",
    "Design Add and Search Words Data Structure",
    "Top K Frequent Elements",
    "Number of Islands",
    "Clone Graph",
    "Pacific Atlantic Water Flow",
    "Course Schedule",
    "Graph Valid Tree",
    "Number of Connected Components in an Undirected Graph",
    "House Robber",
    "House Robber II",
    "Longest Palindromic Substring",
    "Palindromic Substrings",
    "Decode Ways",
    "Coin Change",
    "Maximum Product Subarray",
    "Word Break",
    "Longest Increasing Subsequence",
    "Longest Common Subsequence",
    "Unique Paths",
    "Combination Sum IV",
    "Maximum Subarray",
    "Jump Game",
    "Insert Interval",
    "Merge Intervals",
    "Non-overlapping Intervals",
    "Meeting Rooms II",
    "Set Matrix Zeroes",
    "Spiral Matrix",
    "Rotate Image",
    "Word Search",
    "Sum of Two Integers",
    # Hard
    "Minimum Window Substring",
    "Merge k Sorted Lists",
    "Binary Tree Maximum Path Sum",
    "Serialize and Deserialize Binary Tree",
    "Word Search II",
    "Find Median from Data Stream",
    "Alien Dictionary",
}


def main() -> None:
    data = json.loads(CATALOG.read_text(encoding="utf-8"))
    for item in data:
        tracks = []
        if item["title"] in BEGINNER:
            tracks.append("beginner")
        if item["title"] in EXPERIENCED:
            tracks.append("experienced")
        if not tracks:
            # keep orphan catalog entries playable
            tracks = ["beginner", "experienced"]
        item["tracks"] = tracks
    CATALOG.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    b = sum(1 for x in data if "beginner" in x["tracks"])
    e = sum(1 for x in data if "experienced" in x["tracks"])
    both = sum(1 for x in data if set(x["tracks"]) == {"beginner", "experienced"})
    print(f"total={len(data)} beginner={b} experienced={e} both={both}")


if __name__ == "__main__":
    main()
