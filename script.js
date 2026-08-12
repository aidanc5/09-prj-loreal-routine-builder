/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const selectedProductsList = document.getElementById("selectedProductsList");
const generateRoutineBtn = document.getElementById("generateRoutine");
const clearAllBtn = document.getElementById("clearAllBtn");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");

/* Keep track of selected products - stores product objects */
let selectedProducts = [];

/* Keep track of conversation history for follow-up questions */
let messages = [];

/* Cloudflare Worker URL - calls the Worker that handles OpenAI requests */
const WORKER_URL = "https://loreal.calverta2.workers.dev/";

/* localStorage key for persisting selected products */
const STORAGE_KEY = "loreal_selected_products";

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

/* Create HTML for displaying product cards - each card is clickable */
function displayProducts(products) {
  productsContainer.innerHTML = products
    .map((product) => {
      /* Check if this product is already selected */
      const isSelected = selectedProducts.some((p) => p.id === product.id);
      const selectedClass = isSelected ? "selected" : "";

      return `
    <div class="product-card ${selectedClass}" data-product-id="${product.id}">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <div class="product-header">
          <div>
            <h3>${product.name}</h3>
            <p>${product.brand}</p>
          </div>
          <button class="info-btn" type="button" aria-label="Show details for ${product.name}" aria-expanded="false">
            <i class="fa-solid fa-info-circle"></i>
          </button>
        </div>
        <div class="product-description" aria-hidden="true">
          <p>${product.description}</p>
        </div>
      </div>
    </div>
  `;
    })
    .join("");

  /* Add click handlers to all product cards */
  const productCards = document.querySelectorAll(".product-card");
  productCards.forEach((card) => {
    card.addEventListener("click", handleProductClick);
  });

  /* Add click handlers to info buttons (stops propagation to prevent card selection) */
  const infoBtns = document.querySelectorAll(".info-btn");
  infoBtns.forEach((btn) => {
    btn.addEventListener("click", handleInfoButtonClick);
  });
}

/* Handle info button clicks - toggle description visibility */
function handleInfoButtonClick(event) {
  /* Stop the click from reaching the product card */
  event.stopPropagation();

  const btn = event.currentTarget;
  const card = btn.closest(".product-card");
  const description = card.querySelector(".product-description");

  /* Toggle the description visibility */
  const isExpanded = btn.getAttribute("aria-expanded") === "true";
  btn.setAttribute("aria-expanded", !isExpanded);
  description.setAttribute("aria-hidden", isExpanded);
  card.classList.toggle("expanded");
}

/* Handle product card clicks - toggle selection on/off */
function handleProductClick(event) {
  /* If clicking the info button, don't select the product */
  if (event.target.closest(".info-btn")) {
    return;
  }

  const card = event.currentTarget;
  const productId = card.getAttribute("data-product-id");

  /* Get the full product data from the card */
  const productName = card.querySelector("h3").textContent;
  const productBrand = card.querySelector("p").textContent;
  const productImage = card.querySelector("img").src;

  /* Check if product is already selected */
  const existingIndex = selectedProducts.findIndex((p) => p.id === productId);

  if (existingIndex > -1) {
    /* Product is selected, so remove it */
    selectedProducts.splice(existingIndex, 1);
    card.classList.remove("selected");
  } else {
    /* Product is not selected, so add it */
    selectedProducts.push({
      id: productId,
      name: productName,
      brand: productBrand,
      image: productImage,
    });
    card.classList.add("selected");
  }

  /* Update the selected products display */
  updateSelectedProductsList();
}

/* Update the selected products list display */
function updateSelectedProductsList() {
  if (selectedProducts.length === 0) {
    /* Show empty state message */
    selectedProductsList.innerHTML =
      '<span class="empty-selection">No products selected yet</span>';
  } else {
    /* Create product tags with remove buttons */
    selectedProductsList.innerHTML = selectedProducts
      .map(
        (product) => `
      <div class="product-tag">
        <span>${product.name}</span>
        <button type="button" class="remove-btn" data-product-id="${product.id}" aria-label="Remove ${product.name}">
          ×
        </button>
      </div>
    `,
      )
      .join("");

    /* Add click handlers to remove buttons */
    const removeButtons = document.querySelectorAll(".remove-btn");
    removeButtons.forEach((button) => {
      button.addEventListener("click", handleRemoveProduct);
    });
  }

  /* Save updated selections to localStorage */
  saveSelectedProducts();
}

/* Handle removing a product from the selected list */
function handleRemoveProduct(event) {
  event.preventDefault();
  const productId = event.currentTarget.getAttribute("data-product-id");

  /* Remove from selectedProducts array */
  selectedProducts = selectedProducts.filter((p) => p.id !== productId);

  /* Remove the 'selected' class from the product card if it exists */
  const productCard = document.querySelector(
    `[data-product-id="${productId}"]`,
  );
  if (productCard) {
    productCard.classList.remove("selected");
  }

  /* Update the selected products display */
  updateSelectedProductsList();
}

/* Save selected products to browser's localStorage */
function saveSelectedProducts() {
  /* Convert selectedProducts array to JSON string and store it */
  localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedProducts));
}

/* Load selected products from browser's localStorage */
function loadSelectedProducts() {
  const storedData = localStorage.getItem(STORAGE_KEY);
  if (storedData) {
    try {
      /* Parse the stored JSON string back into an array */
      selectedProducts = JSON.parse(storedData);
    } catch (error) {
      /* If there's an error parsing, start fresh */
      console.error("Error loading saved products:", error);
      selectedProducts = [];
    }
  }
}

/* Clear all selected products */
function clearAllProducts() {
  selectedProducts = [];

  /* Remove 'selected' class from all product cards */
  const selectedCards = document.querySelectorAll(".product-card.selected");
  selectedCards.forEach((card) => {
    card.classList.remove("selected");
  });

  /* Update the display and save to localStorage */
  updateSelectedProductsList();
}

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  const selectedCategory = e.target.value;

  /* Use the globally stored products instead of fetching again */
  const products = window.allProducts || (await loadProducts());

  /* filter() creates a new array containing only products 
     where the category matches what the user selected */
  const filteredProducts = products.filter(
    (product) => product.category === selectedCategory,
  );

  displayProducts(filteredProducts);
});

/* Handle "Generate Routine" button click */
generateRoutineBtn.addEventListener("click", async () => {
  /* Check if user has selected any products */
  if (selectedProducts.length === 0) {
    /* Show error message if no products selected */
    chatWindow.innerHTML = `
      <div style="color: #ff003b; text-align: center; padding: 20px;">
        <p><strong>Please select at least one product</strong></p>
        <p>Choose products from the categories above to build your routine.</p>
      </div>
    `;
    return;
  }

  /* Show loading state */
  chatWindow.innerHTML = `
    <div style="text-align: center; padding: 40px; color: #666;">
      <p><i class="fa-solid fa-spinner fa-spin"></i> Generating your personalized routine...</p>
    </div>
  `;

  /* Format selected products as JSON for the API */
  const productsInfo = selectedProducts
    .map((product) => `- ${product.name} (${product.brand})`)
    .join("\n");

  /* Build the initial message with system context and product selection */
  messages = [
    {
      role: "system",
      content: `You are a knowledgeable and friendly L'Oréal skincare and beauty advisor. Your role is to help customers build personalized skincare, haircare, makeup, fragrance, and beauty routines using L'Oréal products.

IMPORTANT GUIDELINES:
1. Answer questions ONLY about beauty, skincare, haircare, makeup, fragrance, grooming, and related wellness topics
2. If a user asks about unrelated topics (politics, sports, current events, general knowledge, etc.), politely redirect them back to beauty and skincare topics
3. Always reference the products the customer has selected in your responses
4. Remember the entire conversation history to provide consistent, contextual advice
5. Be specific about application methods, frequency, and product combinations
6. If asked about something outside your expertise, acknowledge it but redirect to beauty topics

The customer has selected these L'Oréal products for their routine. Use this information in all responses to provide tailored advice.`,
    },
    {
      role: "user",
      content: `I have selected these L'Oréal products for my routine:\n\n${productsInfo}\n\nPlease create a personalized skincare routine using these products, including when and how to use each one.`,
    },
  ];

  try {
    /* Send request to Cloudflare Worker (which handles the OpenAI API) */
    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: messages }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.message) {
    throw new Error("Worker did not return a message: " + JSON.stringify(data));
}

    const aiResponse = data.message;

    /* Add AI response to message history */
    messages.push({
      role: "assistant",
      content: aiResponse,
    });

    /* Display the AI response with styled formatting */
    chatWindow.innerHTML = `
      <div style="padding: 20px; line-height: 1.8; color: #333;">
        <div style="border-top: 3px solid #ff003b; padding-top: 16px; margin-bottom: 16px;">
          <h3 style="color: #ff003b; margin: 0 0 16px 0; font-size: 18px;">
            <i class="fa-solid fa-sparkles"></i> Your Personalized Routine
          </h3>
        </div>
        <div style="background: rgba(227, 165, 53, 0.08); padding: 16px; border-radius: 6px; border-left: 4px solid #e3a535;">
          ${aiResponse.replace(/\n/g, "<br>")}
        </div>
        <p style="font-size: 12px; color: #999; margin-top: 16px; text-align: center;">
          💬 Ask a follow-up question below to learn more!
        </p>
      </div>
    `;

    /* Enable the chat form for follow-up questions */
    chatForm.style.opacity = "1";
    chatForm.style.pointerEvents = "auto";
  } catch (error) {
    /* Show error message */
    console.error("Error generating routine:", error);
    chatWindow.innerHTML = `
      <div style="color: #ff003b; padding: 20px;">
        <p><strong>Error generating routine</strong></p>
        <p>${error.message}</p>
        <p style="font-size: 12px; color: #999; margin-top: 12px;">
          Make sure the Cloudflare Worker URL is configured correctly in the code.
        </p>
      </div>
    `;
  }
});

/* Chat form submission handler - send follow-up questions to OpenAI via Cloudflare Worker */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const userInput = document.getElementById("userInput");
  const userMessage = userInput.value.trim();

  /* Validate user input */
  if (!userMessage) {
    return;
  }

  /* Check if a routine has been generated (messages array should have at least initial content) */
  if (messages.length === 0) {
    chatWindow.innerHTML = `
      <div style="color: #ff003b; text-align: center; padding: 20px;">
        <p><strong>Please generate a routine first</strong></p>
        <p>Click "Generate Routine" with your selected products to begin.</p>
      </div>
    `;
    userInput.value = "";
    return;
  }

  /* Add user message to conversation history */
  messages.push({
    role: "user",
    content: userMessage,
  });

  /* Clear input field */
  userInput.value = "";

  /* Show loading state */
  chatWindow.innerHTML = `
    <div style="text-align: center; padding: 40px; color: #666;">
      <p><i class="fa-solid fa-spinner fa-spin"></i> Thinking...</p>
    </div>
  `;

  try {
    /* Send conversation history to Cloudflare Worker for follow-up question
       The full messages array is sent, so the AI has complete context of:
       - The system prompt (role: L'Oréal beauty advisor)
       - The selected products
       - All previous messages in the conversation */
    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: messages }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.message) {
    throw new Error("Worker did not return a message: " + JSON.stringify(data));
}

    const aiResponse = data.message;

    /* Add AI response to message history */
    messages.push({
      role: "assistant",
      content: aiResponse,
    });

    /* Display the AI response with styled formatting */
    chatWindow.innerHTML = `
      <div style="padding: 20px; line-height: 1.8; color: #333;">
        <div style="background: rgba(227, 165, 53, 0.08); padding: 16px; border-radius: 6px; border-left: 4px solid #e3a535;">
          ${aiResponse.replace(/\n/g, "<br>")}
        </div>
        <p style="font-size: 12px; color: #999; margin-top: 16px; text-align: center;">
          💬 Ask another question to learn more!
        </p>
      </div>
    `;

    /* Scroll chat window to bottom */
    chatWindow.scrollTop = chatWindow.scrollHeight;
  } catch (error) {
    /* Show error message */
    console.error("Error sending message:", error);
    chatWindow.innerHTML = `
      <div style="color: #ff003b; padding: 20px;">
        <p><strong>Error processing your question</strong></p>
        <p>${error.message}</p>
      </div>
    `;
  }
});

/* Handle "Clear All" button click */
clearAllBtn.addEventListener("click", () => {
  /* Confirm before clearing all selections */
  if (
    confirm(
      "Are you sure you want to clear all selected products? This action cannot be undone.",
    )
  ) {
    clearAllProducts();
  }
});

/* Initialize the page: load saved products from localStorage */
function initializePage() {
  /* Load products from localStorage if they were previously saved */
  loadSelectedProducts();

  /* If there are saved products, update the display */
  if (selectedProducts.length > 0) {
    /* Re-display products from the default category to show which ones are selected */
    const filteredProducts =
      window.allProducts?.filter(
        (product) => product.category === "cleanser",
      ) || [];
    displayProducts(filteredProducts);

    /* Update the selected products list */
    updateSelectedProductsList();
  }
}

/* Store all products globally so we can re-filter them */
window.allProducts = [];

/* Load initial products when the page loads */
(async () => {
  const products = await loadProducts();
  window.allProducts = products;

  /* Initialize the page with saved selections */
  initializePage();
})();
