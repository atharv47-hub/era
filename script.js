const SUPABASE_URL = "https://yyxbvbbrvxamuepbnvun.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_2byxZ-r8Mpk7dZyeZ9PIkQ_e7qMmifC";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

let currentUser = null;
let currentFriend = null;


// ==========================
// LOGIN / REGISTER
// ==========================

function showRegister() {
    document.getElementById("loginBox").classList.add("hidden");
    document.getElementById("registerBox").classList.remove("hidden");
}

function showLogin() {
    document.getElementById("registerBox").classList.add("hidden");
    document.getElementById("loginBox").classList.remove("hidden");
}


// ==========================
// REGISTER
// ==========================

async function register() {

    const username =
        document.getElementById("registerUsername").value.trim();

    const name =
        document.getElementById("registerName").value.trim();

    const email =
        document.getElementById("registerEmail").value.trim();

    const password =
        document.getElementById("registerPassword").value;

    const message =
        document.getElementById("registerMessage");


    if (!username || !name || !email || !password) {
        message.innerText = "Please fill all fields.";
        return;
    }


    if (password.length < 6) {
        message.innerText =
            "Password must be at least 6 characters.";
        return;
    }


    message.innerText = "Creating account...";


    const { data: existingUser, error: usernameError } =
        await supabaseClient
            .from("profiles")
            .select("username")
            .eq("username", username)
            .maybeSingle();


    if (usernameError) {
        message.innerText = usernameError.message;
        return;
    }


    if (existingUser) {
        message.innerText = "Username already exists.";
        return;
    }


    const { data, error } =
        await supabaseClient.auth.signUp({
            email: email,
            password: password
        });


    if (error) {
        message.innerText = error.message;
        return;
    }


    const user = data.user;


    if (!user) {
        message.innerText =
            "Account could not be created.";
        return;
    }


    const { error: profileError } =
        await supabaseClient
            .from("profiles")
            .insert({
                id: user.id,
                username: username,
                full_name: name
            });


    if (profileError) {
        message.innerText =
            profileError.message;
        return;
    }


    message.innerText =
        "Account created! You can now login.";

}


// ==========================
// LOGIN
// ==========================

async function login() {

    const email =
        document.getElementById("loginEmail").value.trim();

    const password =
        document.getElementById("loginPassword").value;

    const message =
        document.getElementById("loginMessage");


    if (!email || !password) {
        message.innerText =
            "Please enter email and password.";
        return;
    }


    message.innerText = "Logging in...";


    const { data, error } =
        await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });


    if (error) {
        message.innerText = error.message;
        return;
    }


    currentUser = data.user;

    await openMessenger();

}


// ==========================
// OPEN MESSENGER
// ==========================

async function openMessenger() {

    document.getElementById("authPage")
        .classList.add("hidden");

    document.getElementById("messengerPage")
        .classList.remove("hidden");


    await loadMyProfile();

    await loadFriends();

}


// ==========================
// MY PROFILE
// ==========================

async function loadMyProfile() {

    const { data, error } =
        await supabaseClient
            .from("profiles")
            .select("username, full_name")
            .eq("id", currentUser.id)
            .single();


    if (error) {
        console.error(error);
        return;
    }


    document.getElementById("myUsername").innerText =
        "@" + data.username;

}


// ==========================
// LOGOUT
// ==========================

async function logout() {

    await supabaseClient.auth.signOut();

    currentUser = null;

    document.getElementById("messengerPage")
        .classList.add("hidden");

    document.getElementById("authPage")
        .classList.remove("hidden");

}


// ==========================
// CHECK LOGIN
// ==========================

async function checkLogin() {

    const { data } =
        await supabaseClient.auth.getSession();


    if (data.session) {

        currentUser =
            data.session.user;

        await openMessenger();

    }

}

checkLogin();


// ==========================
// LOAD FRIENDS
// ==========================

async function loadFriends() {

    const friendsList =
        document.getElementById("friendsList");


    friendsList.innerHTML =
        '<p class="empty">Loading friends...</p>';


    const { data, error } =
        await supabaseClient
            .from("friendships")
            .select("friend_id")
            .eq("user_id", currentUser.id);


    if (error) {

        console.error(error);

        friendsList.innerHTML =
            '<p class="empty">Could not load friends.</p>';

        return;
    }


    if (!data || data.length === 0) {

        friendsList.innerHTML =
            '<p class="empty">No friends yet</p>';

        return;
    }


    friendsList.innerHTML = "";


    for (const friendship of data) {

        const { data: friend } =
            await supabaseClient
                .from("profiles")
                .select("id, username, full_name")
                .eq("id", friendship.friend_id)
                .single();


        if (!friend) continue;


        const friendElement =
            document.createElement("div");


        friendElement.className = "friend";


        friendElement.innerHTML = `

            <div class="avatar">
                ${friend.username.charAt(0).toUpperCase()}
            </div>

            <div>
                <div class="friend-name">
                    ${friend.full_name}
                </div>

                <div class="friend-status">
                    ● Online
                </div>
            </div>

        `;


        friendElement.onclick = () => {
            openChat(friend);
        };


        friendsList.appendChild(friendElement);

    }

}


// ==========================
// ADD FRIEND
// ==========================

function openAddFriend() {

    document.getElementById("addFriendModal")
        .classList.remove("hidden");

}


function closeAddFriend() {

    document.getElementById("addFriendModal")
        .classList.add("hidden");

}


async function addFriend() {

    const username =
        document.getElementById("friendUsername")
            .value.trim();


    const message =
        document.getElementById("friendMessage");


    if (!username) {

        message.innerText =
            "Enter a username.";

        return;
    }


    const { data: friend, error } =
        await supabaseClient
            .from("profiles")
            .select("id, username")
            .eq("username", username)
            .maybeSingle();


    if (error) {

        message.innerText =
            error.message;

        return;
    }


    if (!friend) {

        message.innerText =
            "User not found.";

        return;
    }


    if (friend.id === currentUser.id) {

        message.innerText =
            "You cannot add yourself.";

        return;
    }


    const { data: existing } =
        await supabaseClient
            .from("friend_requests")
            .select("id, status")
            .eq("sender_id", currentUser.id)
            .eq("receiver_id", friend.id)
            .maybeSingle();


    if (existing) {

        message.innerText =
            "Friend request already exists.";

        return;
    }


    const { error: requestError } =
        await supabaseClient
            .from("friend_requests")
            .insert({

                sender_id: currentUser.id,

                receiver_id: friend.id,

                status: "pending"

            });


    if (requestError) {

        message.innerText =
            requestError.message;

        return;
    }


    message.innerText =
        "Friend request sent!";

}


// ==========================
// FRIEND REQUESTS
// ==========================

async function openRequests() {

    document.getElementById("requestsModal")
        .classList.remove("hidden");


    const requestsList =
        document.getElementById("requestsList");


    requestsList.innerHTML =
        "Loading...";


    const { data, error } =
        await supabaseClient
            .from("friend_requests")
            .select("id, sender_id, status, created_at")
            .eq("receiver_id", currentUser.id)
            .eq("status", "pending");


    if (error) {

        requestsList.innerHTML =
            error.message;

        return;
    }


    if (!data || data.length === 0) {

        requestsList.innerHTML =
            "<p>No new friend requests.</p>";

        return;
    }


    requestsList.innerHTML = "";


    for (const request of data) {

        const { data: sender } =
            await supabaseClient
                .from("profiles")
                .select("id, username, full_name")
                .eq("id", request.sender_id)
                .single();


        if (!sender) continue;


        const item =
            document.createElement("div");


        item.className =
            "request-item";


        item.innerHTML = `

            <strong>
                ${sender.full_name}
            </strong>

            <p>
                @${sender.username}
                wants to be your friend.
            </p>

            <div class="request-buttons">

                <button
                    class="accept-btn"
                    onclick="acceptRequest(
                        ${request.id},
                        '${sender.id}'
                    )"
                >
                    Accept
                </button>

                <button
                    class="reject-btn"
                    onclick="rejectRequest(
                        ${request.id}
                    )"
                >
                    Reject
                </button>

            </div>

        `;


        requestsList.appendChild(item);

    }

}


// ==========================
// ACCEPT REQUEST
// ==========================

async function acceptRequest(requestId, senderId) {

    // Update request

    const { error: updateError } =
        await supabaseClient
            .from("friend_requests")
            .update({
                status: "accepted"
            })
            .eq("id", requestId);


    if (updateError) {

        alert(updateError.message);

        return;
    }


    // Add receiver -> sender

    const { error: firstError } =
        await supabaseClient
            .from("friendships")
            .insert({

                user_id: currentUser.id,

                friend_id: senderId

            });


    if (firstError) {

        alert(firstError.message);

        return;
    }


    // Add sender -> receiver

    const { error: secondError } =
        await supabaseClient
            .from("friendships")
            .insert({

                user_id: senderId,

                friend_id: currentUser.id

            });


    if (secondError) {

        alert(secondError.message);

        return;
    }


    alert("Friend added successfully!");


    await loadFriends();

    await openRequests();

}


// ==========================
// REJECT REQUEST
// ==========================

async function rejectRequest(requestId) {

    const { error } =
        await supabaseClient
            .from("friend_requests")
            .update({
                status: "rejected"
            })
            .eq("id", requestId);


    if (error) {

        alert(error.message);

        return;
    }


    await openRequests();

}


// ==========================
// CLOSE REQUESTS
// ==========================

function closeRequests() {

    document.getElementById("requestsModal")
        .classList.add("hidden");

}


// ==========================
// OPEN CHAT
// ==========================

function openChat(friend) {

    currentFriend = friend;


    document.getElementById("welcomeChat")
        .classList.add("hidden");


    document.getElementById("chatHeader")
        .classList.remove("hidden");


    document.getElementById("messages")
        .classList.remove("hidden");


    document.getElementById("messageBox")
        .classList.remove("hidden");


    document.getElementById("chatFriendName")
        .innerText =
        friend.full_name;


    document.getElementById("chatFriendStatus")
        .innerText =
        "● Online";

}