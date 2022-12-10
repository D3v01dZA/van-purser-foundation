var event_url;
var baseURL;
var containerId;
const DonorboxEventWidget = {
  embed: function(opts) {
    event_url = new URL(opts['embedFormSlug'])
    baseURL = event_url.origin
    containerId = opts['container']
    if(!isScriptAlreadyIncluded("https://js.stripe.com/v3/")){
      const script = document.createElement('script');
      script.setAttribute(
        'src',
        'https://js.stripe.com/v3/',
      );
      document.head.appendChild(script);
    }
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
      if (this.readyState == 4 && this.status == 200) {
        document.getElementById(opts['container']).innerHTML = this.response;

        document.querySelectorAll('.ticket-quantity').forEach(element => {
          element.addEventListener('input', e => {
            changeNextButtonStatus()
          })
          element.addEventListener('change', event => {
            errorMessageId = event.target.dataset?.target
            if (errorMessageId == null) return

            if (!event.currentTarget.checkValidity()) {
              document.getElementById(errorMessageId).classList.add('error-message--invalid')
            } else {
              document.getElementById(errorMessageId).classList.remove('error-message--invalid')
            }
          })
        })

        document.querySelectorAll('.selection-quantity-container .down').forEach(element => {
          element.style.display = 'none'
        })

        document.querySelectorAll('.selection-quantity-container .up').forEach(element => {
          element.style.display = 'none'
        })

        if (!validEventStripeAccount()) showStripeErrorMessage()

        document.querySelectorAll('.navigate-button').forEach(function(element) {
          element.addEventListener('click', e => {
            e.preventDefault()
            let action = e.target.getAttribute('data-action')
            let current_step = detectCurrentStep()
            let next_step = detectNextStep(current_step, action)
            if(action == 'next'){
              if (!validateCurrentStep(current_step)) {
                showErrorsFor(current_step)
                return
              }
              else{
                if(document.querySelector('.error')){
                  document.querySelectorAll('.error').forEach((element) => {
                    element.remove();
                  });

                }
              }
            }
            toggleStripeErrorMessage(next_step)
            changeStep(current_step, next_step, action)
            toggle_prev_and_next_buttons(next_step)
          })
        });
      }
    }
    xhttp.open("GET", opts['embedFormSlug'], true);
    xhttp.send();
  }
}

function toggle_prev_and_next_buttons(next_step) {
  switch(next_step){
    case 'step-5':
      document.querySelectorAll('#next_button')[0].classList.add('hidden')
      document.querySelectorAll('#complete_order_button')[0].classList.add('show')
      break
    case 'step-1':
      document.querySelectorAll('#back_button')[0].classList.add('hidden')
      break
    case 'back-to-step-1':
      document.querySelectorAll('#complete_order_button')[0].classList.remove('show')
      document.querySelectorAll('#next_button')[0].classList.remove('hidden')
      document.querySelectorAll('#back_button')[0].classList.add('hidden')
      break
    default:
      document.querySelectorAll('#complete_order_button')[0].classList.remove('show')
      document.querySelectorAll('#next_button')[0].innerText = 'Next'
      document.querySelectorAll('#next_button')[0].classList.remove('hidden')
      document.querySelectorAll('#back_button')[0].classList.remove('hidden')
  }
}
const changeNextButtonStatus = () => {
  setTicketQuantity();
  if(validateStep1()){
    document.querySelector('#next_button').textContent = 'Next'
    document.getElementById("next_button").removeAttribute("disabled");
  }else{
    document.querySelector('#next_button').textContent = 'Please Select A Ticket'
    document.getElementById("next_button").setAttribute('disabled', 'disabled')
  }
}

const setTicketQuantity = () => {
  document.querySelectorAll('.ticket-quantity').forEach( (element, index) => {
    document.querySelectorAll('.selected-ticket-quantity')[index].innerHTML = element.value + 'x'
  });
}

const validateStep1 = () => {
  let valid = false
  document.querySelectorAll('.ticket-quantity').forEach(function(input) {
    if(input.value > 0){
      valid = true
    }
  });

  return valid && (validEventStripeAccount() || isAdminView())
}

const validateStep2 = () => {
  return document.getElementById('answer').value.trim().length > 0
}

function detectInputBox(event) {
  return event.target.parentElement.querySelector('input');
}

function increase(value) {
  return parseInt(value) + 1;
}

function decrease(value) {
  if (value <= 0) return '';
  return parseInt(value) - 1;
}

function detectCurrentStep() {
  return document.querySelectorAll(`#${containerId} .active`)[1].classList[0]
}
function detectNextStep(current_step, action) {
  prev_step = parseFloat(current_step.charAt(current_step.length - 1))
  new_step = action === 'next' ? next_ahead_step(prev_step) : next_behind_step(prev_step)
  return `step-${new_step}`
}

function next_ahead_step(prev_step){
  if(prev_step==1){
    if(document.getElementById('answer') == null) return prev_step + 2
    else return prev_step + 1
  }
  else if(prev_step == 3) {
    if(document.getElementById('offer_separate_donation').value == 'false') return prev_step + 2
    else return prev_step + 1
  }
  else {
    return prev_step + 1
  }
}

function next_behind_step(prev_step){
  if(prev_step==3){
    if(document.getElementById('answer') == null) return prev_step -2
    else return prev_step - 1
  }
  else if(prev_step == 5) {
    if(document.getElementById('offer_separate_donation').value == 'false') return prev_step - 2
    else return prev_step - 1
  }
  else {
    return prev_step - 1
  }
}

const validateCurrentStep = current_step => {
  let valid = true
  switch(current_step){
    case 'step-1':
      valid = validateStep1()
      break

    case 'step-2':
      valid = validateStep2()
      break

    case 'step-3':
      valid = validateStep3()
      break

    case 'step-4':
      valid = validateStep4()
      break
    }
  return valid
}
const showErrorsForStep1 = () => {
  createTopErrorMessage('step-1', 'Please, select at least one ticket type')
}

const showErrorsForStep2 = () => {
  createTopErrorMessage('step-2', 'Please, provide the required information below')
  document.querySelector("#answer").classList.add('invalid')
}

const createTopErrorMessage = (step, errorMessage) => {
  stepElement = document.querySelectorAll(`.${step}`)[0]
  stepElement.prepend(createErrorElement(errorMessage))
}

const toggleStripeErrorMessage = (next_step) => {
  if (shouldShowStripeErrorMessage(next_step)) return showStripeErrorMessage()

  document.querySelector('#error-box').style.display = 'none'
}

const isAdminView = () => !!document.querySelector('#org_admin_events_embed')

const showBackendValidationError = () => {
  document.querySelector('#loading').classList.add('hidden')

  showError("Looks like something went wrong. Don't worry, you have not been charged. \
    Please reload the page and fill out the form again to complete your purchase.")
}

const showStripeErrorMessage = () => {
  if (isAdminView()) showStripeErrorToAdmin()
  else showStripeErrorToBuyer()
}

const shouldShowStripeErrorMessage = (next_step) => {
  return !validEventStripeAccount() && (next_step === 'step-1' || next_step === 'step-5')
}

const showStripeErrorToAdmin = () => {
  showError("Ticket purchases will not be possible until you connect Stripe \
    for payment processing.")
}

const showStripeErrorToBuyer = () => {
  showError("This event is not currently able to sell tickets. \
    If you'd like to buy ticket, contact the organization and ask them to connect \
    Stripe to their Donorbox account.")
}

const showError = (errorMessage) => {
  errorBox = document.querySelector('#error-box')
  errorMessageElement = errorBox.querySelector('.error-msg')

  errorBox.style.display = 'flex'
  errorMessageElement.innerText = errorMessage
}

const createErrorElement = (errorMessage) => {
  errorElement = document.createElement('p')
  errorElement.className = 'error left'
  errorElement.textContent = errorMessage
  return errorElement
}

const showErrorsForStep3 = () => {
  document.querySelectorAll('.information-field').forEach((field) => {
    if (field.id === 'email' && field.value !== ''){
      field.value.trim().match(/^[\w.]+@\w+\.\w+/) ? null :
        field.after(createErrorElement('Email format is incorrect'))
        field.classList.add("invalid")
    }
    if(field.value === '') {
      field.after(createErrorElement('This field must be filled'))
      field.classList.add("invalid")
    }
  })
}

const showErrorsForStep4 = () => {
  let field = document.querySelectorAll('.donation-input')[0]
  field.after(createErrorElement('Please enter an amount'))
}

const showErrorsFor = current_step => {
  if (document.querySelectorAll('.error').length > 0) {
    document.querySelectorAll('.error').forEach(e => e.remove());
  }
  switch(current_step){
    case 'step-1':
      showErrorsForStep1()
      break
    case 'step-2':
      showErrorsForStep2()
      break
    case 'step-3':
      showErrorsForStep3()
      break
    case 'step-4':
      showErrorsForStep4()
      break
  }
}

const changeStep = (current, to, action) => {
  let current_step = document.querySelector(`.${current}`)
  let next_step = document.querySelector(`.${to}`)

  if (current_step && next_step) {
    current_step.classList.remove('active')
    next_step.classList.add('active')

    current === 'step-5'? hideStripeForm() : null
    to === 'step-5' ? handleStep5() : null
    changeProgressBar(current, to, action)
  }
}

const changeProgressBar = (current, to, action) => {
  let current_progress = document.querySelector(`.${current}-progress`)
  let next_progress = document.querySelector(`.${to}-progress`)

  if (current_progress && next_progress) {
    current_progress.classList.remove('active')
    next_progress.classList.add('active')

    if (action == 'prev') {
      next_progress.classList.remove('complete')
    } else {
      current_progress.classList.add('complete')
    }
  }
}

const validateStep3 = () => {
  let valid = Array.from(document.querySelectorAll('.information-field'))
  return valid.every(field => {
    if (field.id === 'email'){
      isMatch = field.value.trim().match(/[A-Z0-9_.&%+\-']+@(?:[A-Z0-9\-]+\.)+(?:[A-Z]{2,25})/i) ? true : false
      return isMatch
    }
    return field.value.trim().length > 0
  })
}
const validateStep4 = () => {
  let donate = document.querySelectorAll('#make_a_donation')[0].checked
  return donate ? parseFloat(document.querySelectorAll('.donation-amount')[0].value) > 0 : true
}
handleStep5 = () => {
  fetchDataAndCalculatePricing()
  renderStripeForm()
}

const fetchDataAndCalculatePricing = () => {
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      response = this.response
      ticket_event = response.event
      ticket_types = response.ticket_types
      document.querySelectorAll('.is-collect-tax')[0].value = ticket_event.collect_tax
      document.querySelectorAll('.is-tax-amount-included')[0].value = ticket_event.tax_amount_included
      if(document.querySelectorAll('.tax-rate')[0] !== undefined) {
        document.querySelectorAll('.tax-rate')[0].setAttribute('data-amount', ticket_event.tax_rate)
        document.querySelectorAll('.tax-rate')[0].innerText = `Sales Tax (${ticket_event.tax_rate}%)`
      }
      document.querySelectorAll('.order-summary').forEach(function(element) {
        element.classList.remove('hidden-item')
      })

      Array.from(document.querySelectorAll('.ticket-quantity')).forEach( (element, index) => {
        if(parseInt(element.value) > 0){
          document.querySelectorAll('.is-tax-deductible')[index].value = ticket_types[index].tax_deductible
          document.querySelectorAll('.fair-market-value')[index].value = parseFloat(ticket_types[index].fair_market_value_cents/100) || 0
          document.querySelectorAll('.ticket-name')[index].innerText = ticket_types[index].name
          document.querySelectorAll('.summary-ticket-name')[index].innerText = ticket_types[index].name
          document.querySelectorAll('.ticket-price')[index].setAttribute('data-price', parseFloat(ticket_types[index].price_cents/100))
          document.querySelectorAll('.ticket-price')[index].innerText = `$${ticket_types[index].computed_total_price_cents/100} per ticket`
          let summary_price_1 = `$${ticket_types[index].price_cents/100} ($${ticket_types[index].tax_deductible_amount_cents/100} tax-deductible) per ticket`
          let summary_price_2 = `$${ticket_types[index].price_cents/100} per ticket`
          document.querySelectorAll('.summary-ticket-price')[index].innerText = document.querySelectorAll('.tax-deductible-amount')[index] ? summary_price_1 : summary_price_2
          if(document.querySelectorAll('.tax-deductible-amount')[index]){
            document.querySelectorAll('.tax-deductible-amount')[index].setAttribute('data-price', parseFloat(ticket_types[index].tax_deductible_amount_cents/100))
            document.querySelectorAll('.tax-deductible-amount')[index].innerText = `$${ticket_types[index].tax_deductible_amount_cents/100} per ticket`
          }
        }else{
          document.querySelectorAll('.order-summary').forEach(function(element, i) {
            if(i == index){
              element.classList.add('hidden-item')
            }
          })
        }
      })

      calculatePricing()
    }
  }
  let pathArray = event_url.pathname.split('/')
  let event_id = pathArray[pathArray.length - 1]
  xhttp.open( "GET", `${baseURL}/events/${event_id}.json`, true ); // false for synchronous request
  xhttp.responseType = "json";
  xhttp.send({
    'id': document.querySelectorAll('.form-id')[0].value
  });

}

const calculatePricing = () => {
  let cumulative_tickets_price = 0
  let grand_total = 0
  let collect_tax = document.querySelectorAll('.is-collect-tax')[0].value
  let tax_included = document.querySelectorAll('.is-tax-amount-included')[0].value
  let tax_amount = 0
  let tax_field = document.querySelectorAll('.tax-amount')[0]
  let tax_rate = document.querySelectorAll('.tax-rate')[0] ? parseFloat(document.querySelectorAll('.tax-rate')[0].getAttribute('data-amount')) : 0
  let cumulative_price_field = document.querySelectorAll('.cumulative-tickets-price')[0]
  let subtotal_field = document.querySelectorAll('.subtotal-ticket-price')[0]
  let donation_amount = parseFloat(document.querySelectorAll('.donation-amount')[0].value)
  let donation_made = document.querySelectorAll('#make_a_donation')[0].checked

  Array.from(document.querySelectorAll('.ticket-quantity')).forEach( (element, index) => {
    let tax_deductible = document.querySelectorAll('.is-tax-deductible')[index].value
    let value = element.value * document.querySelectorAll('.ticket-price')[index].getAttribute('data-price')
    let html = '$' + value.toFixed(2)
    let fair_market_value = document.querySelectorAll('.fair-market-value')[index].value
    let taxable_amount = tax_deductible === 'true' ? fair_market_value * element.value : value


    cumulative_tickets_price += value
    subtotal_field.innerHTML = '$' + cumulative_tickets_price.toFixed(2)
    subtotal_field.setAttribute('data-amount', cumulative_tickets_price)

    if (collect_tax === 'true') {
      if (tax_included === 'false') {
        tax_amount += (taxable_amount * tax_rate) / 100
      }
    }
    document.querySelectorAll('.total-ticket-price')[index].innerHTML = html
  });

  grand_total = cumulative_tickets_price + tax_amount
  grand_total += donation_made ? donation_amount : 0

  if (tax_field) {
    tax_field.innerHTML = '$' + tax_amount.toFixed(2)
    tax_field.setAttribute('data-amount', tax_amount)
  }

  cumulative_price_field.innerHTML = '$' + grand_total.toFixed(2)
  cumulative_price_field.setAttribute('data-amount', grand_total)
  document.querySelectorAll('#complete_order_button')[0].innerText = `Pay ${cumulative_price_field.innerHTML}`
}

const renderStripeForm = async () => {
  if(!validEventStripeAccount()){
    document.querySelector('#complete_order_button').disabled = true
    return
  }
  switch_loading(true)
  const stripe_public_key = document.getElementById('stripe_public_key').value;
  const connected_account = document.getElementById('stripe_connected_account').value;
  const stripe = Stripe(stripe_public_key, {stripeAccount: connected_account});
  const contact_info = contactInfo()

  if (detectCurrentStep() != 'step-5') return

  const my_response = await createPaymentIntent()

  if (my_response.type === 'ticket sold out') return ticket_sold_out(my_response);
  const clientSecret = my_response.clientSecret
  const purchaseID = my_response.purchaseID
  document.getElementById('purchase_id').value = purchaseID

  old_element = document.getElementById('complete_order_button')
  var new_element = old_element.cloneNode(true);
  old_element.parentNode.replaceChild(new_element, old_element);  //cancel previous event handlers, since previous could be free and this one could be paid.
  if(clientSecret == 'Blank Intent') {
    handle_free_purchase()
  } else {
    const elements = stripe.elements({ clientSecret })
    const paymentElement = elements.create('payment', {
      fields: {
        billingDetails: 'never'
      }
    });
    paymentElement.mount('#payment-element')
    document.querySelector('.credit_card-details').classList.add('show')
    handle_complete_purchase(stripe, elements, purchaseID, contact_info)
  }
  switch_loading(false)
}

const ticket_sold_out = (my_response) => {
  createTopErrorMessage('step-1', my_response.error);
  changeStep(detectCurrentStep(), 'step-1', '');
  toggle_prev_and_next_buttons('back-to-step-1');
  switch_loading(false);
  hideStripeForm();
}

const validEventStripeAccount = () => document.querySelectorAll('.event-stripe-connected')[0].value == 'true'

const switch_loading = loading => {
  if(loading){
    document.querySelector('#loading').classList.remove('hidden')
    document.querySelector('#back_button').disabled = true
    document.querySelector('#complete_order_button').disabled = true
  }else {
    document.querySelector('#loading').classList.add('hidden')
    document.querySelector('#back_button').disabled = false
    document.querySelector('#complete_order_button').disabled = false
  }
}
// const $ = (selector)=>{
//   return document.querySelectorAll(selector)
// }

const contactInfo = () => {
  contact_information = {}
  Array.from(document.querySelectorAll('.information-field')).forEach((field) => {
    contact_information[field.id] = field.value
  });
  return contact_information
}
const createPaymentIntent = async () => {
  const response = await fetch(`${baseURL}/create_payment_intent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: lineItems(),
      contact_info: contactInfo(),
      purchase_id: document.getElementById('purchase_id').value
    })
  });

  if (response.status == 422) {
    showBackendValidationError()
  } else {
    json = await response.json()
    return json
  }
}
const lineItems = () => {
  let donate = document.getElementById('make_a_donation').checked
  let items = {
    donation: donate ? document.getElementById('donation_amount').value : null
  }

  items.ticket_types = Array.from(document.querySelectorAll('.ticket-quantity'))
    .map( (ticket_type, index) => (
      {
        id: ticket_type.getAttribute('data-id'),
        quantity: ticket_type.value
      }
    ));
  return items
}

const handle_free_purchase = async () => {
  document.getElementById('complete_order_button').innerHTML = 'Complete order'
  document.getElementById('complete_order_button').addEventListener('click', async function(e){
    e.preventDefault()
    let purchaseID = document.getElementById('purchase_id').value
    e.target.setAttribute('disabled', true);

    const response = await fetch(`${baseURL}/tickets/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: purchaseID
      })
    });
    data = await response.json()
    if(data.purchase == purchaseID){
      redirectUrl = `${baseURL}/tickets/thank_you?embedded=true&purchase_id=${purchaseID}`
      document.getElementById('tickets_show').innerHTML = `<iframe style="width: 100%;height: 500px;" src=${redirectUrl}></iframe>`
    }
  })
}
const handle_complete_purchase = (stripe, elements, purchaseID, contact_info) => {
  document.getElementById('complete_order_button').addEventListener('click', async function(e){
    e.preventDefault()
    e.target.setAttribute('disabled', 'disabled');
    payment_error_types = ['card_error', 'validation_error', 'invalid_request_error']
    await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${baseURL}/tickets/thank_you?purchase_id=${purchaseID}`,
        payment_method_data: {
          billing_details: {
            address: {
              city: contact_info['city'],
              country: contact_info['country'],
              line1: contact_info['address'],
              line2: null,
              postal_code: contact_info['postal_code'],
              state: contact_info['state'],
            },
            email: contact_info['email'],
            name: full_name([contact_info['first_name'], contact_info['last_name']]),
            phone: contact_info['phone']
          },
        },

      },
      redirect: 'if_required'
    })
    .then(function(result) {
      if (result.error) {
        if (payment_error_types.includes(result.error.type)) {
          showMessage(error.message);
        } else {
          showMessage("An unexpected error occurred.");
        }
      } else{
        redirectUrl = `${baseURL}/tickets/thank_you?embedded=true&purchase_id=${purchaseID}&payment_intent=${result.paymentIntent.id}`
        document.getElementById('tickets_show').innerHTML = `<iframe style="width: 100%;height: 500px;" src=${redirectUrl}></iframe>`
      }
    });
    e.target.removeAttribute('disabled')
  })
}
const full_name = (names) => {
  names = names.filter(name => name != null && name.length > 0)
  return names.join(' ')
}

function showMessage(messageText) {
  const messageContainer = document.querySelector("#payment-message");
  messageContainer.textContent = messageText;

}

const hideStripeForm = () => {
  document.querySelector("#payment-element").classList.remove("show");
  document.querySelector("#payment-message").innerText = '';
}

function isScriptAlreadyIncluded(src){
  var scripts = document.getElementsByTagName("script");
  for(var i = 0; i < scripts.length; i++)
    if(scripts[i].getAttribute('src') == src) return true;
  return false;
}

DonorboxEventWidget.embed({container: 'donorboxEmbed',embedFormSlug: 'https://donorbox.org/embed_event/386951'});