import { CallState } from '../types/callState'

export interface DemoTranscriptItem {
  id: string
  timestamp: string
  speaker: 'CUSTOMER' | 'RELAY' | 'MAYA'
  content: string
  translation?: string
  language?: string
  isTool?: boolean
  toolName?: string
  status?: string
}

export interface DemoScenario {
  id: string
  title: string
  tag: string
  description: string
  caseId: string
  caseTitle: string
  customer: string
  language: string
  sentiment: 'Frustrated' | 'Neutral' | 'Hostile' | 'Satisfied'
  callState: CallState
  isHumanTakeover: boolean
  isServiceFailed?: boolean
  transcript: DemoTranscriptItem[]
  proposedAction: {
    title: string
    amount?: string
    risk: 'Low' | 'Medium' | 'High'
    reason: string
    actionBasis: string[]
  }
}

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'delivery-refund',
    title: 'Delivery refund',
    tag: 'CORE WORKFLOW',
    description: 'Order #84921 delayed 3 days. Customer requests ₹1,499 refund in Hindi.',
    caseId: 'RLY-1042',
    caseTitle: 'Delivery dispute',
    customer: 'Aarav Sharma',
    language: 'Hindi',
    sentiment: 'Frustrated',
    callState: 'WAITING_FOR_APPROVAL',
    isHumanTakeover: false,
    transcript: [
      {
        id: 'dr-1',
        timestamp: '21:33:42',
        speaker: 'CUSTOMER',
        content: '"Mera order 5 din se nahi aaya."',
        translation: "My order hasn't arrived for 5 days.",
        language: 'Hindi',
      },
      {
        id: 'dr-2',
        timestamp: '21:33:46',
        speaker: 'RELAY',
        content: '"I\'ll check that for you."',
        translation: 'Main abhi check karti hoon.',
        language: 'English',
      },
      {
        id: 'dr-3',
        timestamp: '21:33:51',
        speaker: 'RELAY',
        content: 'getOrderStatus(orderId="84921")',
        isTool: true,
        toolName: 'getOrderStatus()',
        status: 'DELIVERY_EXCEPTION',
      },
      {
        id: 'dr-4',
        timestamp: '21:33:52',
        speaker: 'RELAY',
        content: '"Your order has a delivery exception."',
        translation: 'Aapke order mein delivery exception hai.',
        language: 'English',
      },
      {
        id: 'dr-5',
        timestamp: '21:34:03',
        speaker: 'CUSTOMER',
        content: '"Mujhe refund chahiye."',
        translation: 'I want a refund.',
        language: 'Hindi',
      },
    ],
    proposedAction: {
      title: 'REFUND REQUEST',
      amount: '₹1,499',
      risk: 'Medium',
      reason: 'Delivery exception',
      actionBasis: [
        'Order delayed 3 days',
        'Customer explicitly requested refund',
        'Refund policy permits refund',
        'No previous refund detected',
      ],
    },
  },
  {
    id: 'payment-failure',
    title: 'Payment failure',
    tag: 'GATEWAY TIMEOUT',
    description: 'UPI debited twice for order #91024. Agent verifies bank reconciliation.',
    caseId: 'RLY-1039',
    caseTitle: 'Double debit dispute',
    customer: 'Priya Shah',
    language: 'English',
    sentiment: 'Frustrated',
    callState: 'TOOL_EXECUTING',
    isHumanTakeover: false,
    transcript: [
      {
        id: 'pf-1',
        timestamp: '21:28:10',
        speaker: 'CUSTOMER',
        content: '"My bank account was debited twice for ₹2,499 but order is showing pending."',
        language: 'English',
      },
      {
        id: 'pf-2',
        timestamp: '21:28:14',
        speaker: 'RELAY',
        content: 'reconcilePaymentGateway(txnId="TXN-99214")',
        isTool: true,
        toolName: 'reconcilePaymentGateway()',
        status: 'DUPLICATE_AUTH_FOUND',
      },
      {
        id: 'pf-3',
        timestamp: '21:28:18',
        speaker: 'RELAY',
        content: '"I see the duplicate authorization of ₹2,499. The secondary hold is being auto-reversed to your VPA."',
        language: 'English',
      },
    ],
    proposedAction: {
      title: 'AUTO-REVERSE CHARGE',
      amount: '₹2,499',
      risk: 'Low',
      reason: 'Duplicate gateway capture confirmed',
      actionBasis: [
        'Bank authorization gateway verified dual capture',
        'Order value is single quantity ₹2,499',
        'Auto-reversal allowed under instant UPI SLA',
      ],
    },
  },
  {
    id: 'language-switch',
    title: 'Language switch',
    tag: 'MULTILINGUAL ASR',
    description: 'Customer starts in English, switches to pure Hindi mid-conversation.',
    caseId: 'RLY-1044',
    caseTitle: 'Address reroute',
    customer: 'Rahul Mehta',
    language: 'Hinglish → Hindi',
    sentiment: 'Neutral',
    callState: 'CUSTOMER_SPEAKING',
    isHumanTakeover: false,
    transcript: [
      {
        id: 'ls-1',
        timestamp: '21:25:00',
        speaker: 'CUSTOMER',
        content: '"Hi, I want to change my delivery address for tomorrow\'s shipment."',
        language: 'English',
      },
      {
        id: 'ls-2',
        timestamp: '21:25:05',
        speaker: 'RELAY',
        content: '"Certainly, please share your updated pincode and street address."',
        language: 'English',
      },
      {
        id: 'ls-3',
        timestamp: '21:25:12',
        speaker: 'CUSTOMER',
        content: '"Bhaiya actually main Gurgaon mein nahi hoon, mujhe Noida Sector 62 bhejna hai."',
        translation: 'Actually I am not in Gurgaon, please send it to Noida Sector 62.',
        language: 'Hindi',
      },
      {
        id: 'ls-4',
        timestamp: '21:25:16',
        speaker: 'RELAY',
        content: '"Ji bilkul, main abhi delivery address Noida Sector 62 update kar deti hoon."',
        translation: 'Certainly, updating delivery address to Noida Sector 62.',
        language: 'Hindi',
      },
    ],
    proposedAction: {
      title: 'REROUTE SHIPMENT',
      risk: 'Low',
      reason: 'Customer destination change',
      actionBasis: [
        'Shipment is in DISPATCH_PREP status',
        'Noida hub within standard NCR delivery zone',
        'Zero additional freight surcharge required',
      ],
    },
  },
  {
    id: 'human-takeover',
    title: 'Human takeover',
    tag: '0MS DUPLEX HANDOFF',
    description: 'High-risk enterprise cancellation triggering instant Maya Sharma briefing.',
    caseId: 'RLY-1038',
    caseTitle: 'Enterprise cancellation',
    customer: 'Vikram Patel',
    language: 'English',
    sentiment: 'Hostile',
    callState: 'HUMAN_ACTIVE',
    isHumanTakeover: true,
    transcript: [
      {
        id: 'ht-1',
        timestamp: '21:20:00',
        speaker: 'CUSTOMER',
        content: '"I want to cancel our enterprise contract right now and talk to a human manager."',
        language: 'English',
      },
      {
        id: 'ht-2',
        timestamp: '21:20:04',
        speaker: 'RELAY',
        content: 'flagHighRiskEscalation(level="TIER_2_RETENTION")',
        isTool: true,
        toolName: 'flagHighRiskEscalation()',
        status: 'DISPATCHED_TO_MAYA',
      },
      {
        id: 'ht-3',
        timestamp: '21:20:08',
        speaker: 'MAYA',
        content: '"Hello Vikram, this is Maya Sharma, Senior Operations Lead. I have your account details open in front of me."',
        language: 'English',
      },
    ],
    proposedAction: {
      title: 'ENTERPRISE RETENTION ESCALATION',
      amount: '₹4,999/yr',
      risk: 'High',
      reason: 'Contract dispute',
      actionBasis: [
        'Contract value exceeds autonomous threshold',
        'Customer requested tier-2 supervisor',
        'Full handoff brief synced in < 2 seconds',
      ],
    },
  },
  {
    id: 'tool-failure',
    title: 'Tool failure',
    tag: '504 RESILIENCE',
    description: 'Logistics API throws 504 Gateway Timeout. System engages graceful recovery.',
    caseId: 'RLY-1037',
    caseTitle: 'Carrier sync failure',
    customer: 'Sunita Roy',
    language: 'Hindi',
    sentiment: 'Frustrated',
    callState: 'TOOL_ERROR',
    isHumanTakeover: false,
    isServiceFailed: true,
    transcript: [
      {
        id: 'tf-1',
        timestamp: '21:18:00',
        speaker: 'CUSTOMER',
        content: '"Mera package track nahi ho raha hai, error aa raha hai."',
        translation: 'My package is not tracking, error is showing up.',
        language: 'Hindi',
      },
      {
        id: 'tf-2',
        timestamp: '21:18:05',
        speaker: 'RELAY',
        content: 'getCarrierTracking(awb="DEL-9928174")',
        isTool: true,
        toolName: 'getCarrierTracking()',
        status: '504_GATEWAY_TIMEOUT',
      },
    ],
    proposedAction: {
      title: 'MANUAL CARRIER TRACE',
      risk: 'Medium',
      reason: 'Carrier API timeout',
      actionBasis: [
        'Primary carrier tracking gateway timed out at 5000ms',
        'No automated actions committed',
        'Fallback to human dispatch or replica queue',
      ],
    },
  },
  {
    id: 'angry-customer',
    title: 'Angry customer',
    tag: 'SENTIMENT RESOLUTION',
    description: 'Hostile caller with multiple delayed orders de-escalated via compensation.',
    caseId: 'RLY-1031',
    caseTitle: 'Multiple delayed shipments',
    customer: 'Kunal Singhania',
    language: 'Hindi / Hinglish',
    sentiment: 'Hostile',
    callState: 'WAITING_FOR_APPROVAL',
    isHumanTakeover: false,
    transcript: [
      {
        id: 'ac-1',
        timestamp: '21:12:00',
        speaker: 'CUSTOMER',
        content: '"Yeh teesri baar hai jab tumhari service ne mera time waste kiya hai!"',
        translation: 'This is the third time your service has wasted my time!',
        language: 'Hindi',
      },
      {
        id: 'ac-2',
        timestamp: '21:12:05',
        speaker: 'RELAY',
        content: '"Main aapki pareshani samajhti hoon. Main turant aapke saare orders check karti hoon."',
        translation: 'I understand your frustration. Checking all your orders immediately.',
        language: 'Hindi',
      },
      {
        id: 'ac-3',
        timestamp: '21:12:10',
        speaker: 'RELAY',
        content: 'getCustomerOrderHistory(customerId="CUST-8819")',
        isTool: true,
        toolName: 'getCustomerOrderHistory()',
        status: '3_ORDERS_DELAYED',
      },
    ],
    proposedAction: {
      title: 'ISSUE APOLOGY CREDIT ₹1,000',
      amount: '₹1,000',
      risk: 'Medium',
      reason: 'High customer churn risk compensation',
      actionBasis: [
        'Customer experienced 3 consecutive delayed deliveries',
        'Lifetime spend exceeds ₹45,000',
        'Retention credit calculated to prevent churn',
      ],
    },
  },
]
