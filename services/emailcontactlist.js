const Mailjet = require('node-mailjet');
const config = require('../routes/config');

// Initialize Mailjet client once
const mailjetClient = Mailjet.connect(
  config.mailjet.apiKeyPublic,
  config.mailjet.apiKeyPrivate
);

/**
 * Manages a contact's subscription to a Mailjet contact list with ListID 10538655.
 * @param {Object} params - Parameters for the list recipient operation
 * @param {string|number} [params.contactId] - Contact ID (optional if contactAlt is provided)
 * @param {string} [params.contactAlt] - Contact email (optional if contactId is provided)
 * @param {boolean} params.isUnsubscribed - Whether the contact is unsubscribed
 * @returns {Promise<Object>} Mailjet API response
 * @throws {Error} If the request fails or parameters are invalid
 */
async function manageListRecipient({
  contactId,
  contactAlt,
  isUnsubscribed
}) {
  // Validate input parameters
  if (!contactId && !contactAlt) {
    throw new Error('Either contactId or contactAlt must be provided');
  }
  if (typeof isUnsubscribed !== 'boolean') {
    throw new Error('isUnsubscribed must be a boolean');
  }

  // Prepare payload
  const payload = {
    IsUnsubscribed: isUnsubscribed.toString(), // Mailjet expects string "true"/"false"
    ListID: '10538655' // Hardcoded ListID as specified
  };
  if (contactId) payload.ContactID = contactId.toString();
  if (contactAlt) payload.ContactAlt = contactAlt;

  try {
    // Make API request
    const response = await mailjetClient
      .post('listrecipient', { version: config.mailjet.apiVersion || 'v3' })
      .request(payload);

    // Log success
    console.log('Successfully managed list recipient:', response.body);
    return response.body;
  } catch (err) {
    // Handle Mailjet-specific errors
    const errorDetails = {
      statusCode: err.statusCode || 'N/A',
      message: err.message || 'Unknown error',
      response: err.response ? err.response.body : null
    };

    // Log detailed error
    console.error('Error managing list recipient:', errorDetails);

    // Throw specific errors for common cases
    if (err.statusCode === 400) {
      throw new Error(`Bad request: ${JSON.stringify(errorDetails.response)}`);
    } else if (err.statusCode === 401) {
      throw new Error('Authentication failed: Check API keys in config');
    } else if (err.statusCode === 429) {
      throw new Error('Rate limit exceeded: Try again later');
    } else {
      throw new Error(`Mailjet API error: ${errorDetails.message}`);
    }
  }
}

module.exports = { manageListRecipient };