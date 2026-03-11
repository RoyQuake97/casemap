#!/usr/bin/env python3
"""Build expanded Code of Obligations and Contracts JSON from available sources."""
import json

law = {
    "id": "LB-CIV-001-EXPANDED",
    "title_en": "Code of Obligations and Contracts (1932) - Expanded",
    "title_ar": "قانون الموجبات والعقود",
    "category": "civil",
    "subcategory": "obligations_contracts",
    "date_enacted": "1932-03-09",
    "source": "Law of 9 March 1932 (Code des Obligations et des Contrats)",
    "historical_context": "The Lebanese Code of Obligations and Contracts was promulgated on 9 March 1932 during the French Mandate period. It is heavily influenced by the French Civil Code and the Ottoman Mejelle. The Code contains 1,106 articles organized into several books covering general obligations, specific contracts, and civil liability. It remains the foundational civil law text in Lebanon governing contractual relationships, torts, property, and civil obligations.",
    "key_articles": []
}

articles = [
    # BOOK I: OBLIGATIONS IN GENERAL
    # Title I: Sources of Obligations
    ## Chapter 1: Contract
    {"number": "1", "title": "Definition of Obligation", "content": "An obligation is a legal bond by which one or more persons are bound towards one or more other persons to give, to do, or not to do something."},
    {"number": "2", "title": "Sources of Obligations", "content": "Obligations arise from contracts, quasi-contracts, torts (unlawful acts), quasi-torts, and the law."},
    {"number": "3", "title": "Good Faith in Obligations", "content": "All obligations must be performed in good faith. The parties must act honestly and fairly in the performance of their obligations and in the exercise of their rights."},
    
    # Formation of Contracts
    {"number": "165", "title": "Definition of Contract", "content": "A contract is an agreement by which one or more persons bind themselves towards one or more other persons to give, to do, or not to do something. A contract is formed by the meeting of an offer and an acceptance."},
    {"number": "166", "title": "Essential Elements of Contract", "content": "For a contract to be validly formed, the following conditions must be met: (1) consent of the parties; (2) capacity to contract; (3) a definite object forming the subject matter of the contract; (4) a lawful cause."},
    {"number": "167", "title": "Freedom of Contract", "content": "The parties are free to determine the content of the contract, provided they do not violate public order or morality. Contractual freedom includes the freedom to enter into a contract, to choose the other contracting party, and to determine the terms of the contract."},
    {"number": "168", "title": "Binding Force of Contract", "content": "A lawfully formed contract is binding upon the parties. It can be revoked or modified only by the mutual consent of the parties or on grounds provided by law. Contracts must be performed in good faith."},
    
    # Consent
    {"number": "169", "title": "Consent", "content": "Consent is the agreement of the wills of the contracting parties on the essential elements of the contract. Consent must be free and informed."},
    {"number": "170", "title": "Offer", "content": "An offer is a unilateral declaration of will addressed to one or more persons, containing all the essential elements of the contract and expressing the intention to be bound upon acceptance."},
    {"number": "171", "title": "Acceptance", "content": "Acceptance is the expression of the offeree's agreement to the terms of the offer. Acceptance must correspond to the offer. An acceptance that modifies the terms of the offer constitutes a counter-offer."},
    {"number": "172", "title": "Silence as Acceptance", "content": "Silence does not constitute acceptance unless the circumstances or the relationship between the parties indicate otherwise, or unless such silence is considered acceptance under commercial custom."},
    
    # Defects of Consent
    {"number": "202", "title": "Error (Mistake)", "content": "A contract may be annulled if one of the parties was in error regarding the substance of the thing that is the object of the contract, or regarding a quality that was essential in the eyes of the parties. Error regarding the person of the other contracting party is a ground for annulment only in contracts where the personality of the contracting party is essential."},
    {"number": "207", "title": "Fraud (Dol)", "content": "Fraud is a ground for annulment of the contract when the artifices employed by one of the parties are such that without them the other party would not have contracted. Fraud is not presumed and must be proven."},
    {"number": "209", "title": "Duress (Violence)", "content": "Violence is a ground for annulment of the contract when it has been exercised on the contracting party in such a manner as to produce in the mind of a reasonable person a fear of exposing himself or his property to serious and imminent harm. Violence may be physical or moral."},
    {"number": "213", "title": "Lesion (Lésion)", "content": "Lesion does not, in general, vitiate a contract. However, when a party exploits the other party's weakness, distress, or inexperience to obtain an excessive advantage, the contract may be rescinded or the obligation reduced to a reasonable limit."},
    
    # Capacity
    {"number": "215", "title": "Capacity to Contract", "content": "Every person has the capacity to contract unless declared incapable by law. Minors, interdicted persons, and persons of unsound mind lack full capacity to contract."},
    {"number": "216", "title": "Minors", "content": "A minor who has not reached the age of majority cannot enter into a valid contract. However, contracts entered into by a minor may be ratified upon reaching the age of majority. Contracts for necessities may bind a minor to the extent of the benefit received."},
    
    # Object and Cause
    {"number": "221", "title": "Object of the Contract", "content": "The object of the obligation must be a thing or an act that is determinate or determinable, possible, and lawful. Things that are outside commerce cannot be the object of a contract."},
    {"number": "225", "title": "Cause of the Obligation", "content": "The cause is the reason why each party undertakes an obligation. The cause must exist, be lawful, and not be contrary to public order or morality. A contract without a cause or with an unlawful cause is void."},
    
    # Effects of Obligations
    {"number": "228", "title": "Performance of Obligations", "content": "The debtor is bound to perform his obligation exactly as stipulated. If performance in kind is not possible, the debtor may be ordered to pay damages."},
    {"number": "229", "title": "Specific Performance", "content": "The creditor may demand specific performance of the obligation. If the debtor fails to perform, the court may authorize the creditor to have the performance carried out at the debtor's expense."},
    {"number": "230", "title": "Penalty Clause", "content": "The parties may agree in advance on the amount of damages to be paid in case of non-performance or delay in performance. The court may reduce or increase the penalty if it is manifestly excessive or derisory."},
    
    # Damages
    {"number": "252", "title": "Contractual Damages - Conditions", "content": "The debtor is liable for damages when he fails to perform his obligation in whole or in part, or when he is late in performing it, unless he proves that the failure or delay is due to a cause beyond his control."},
    {"number": "253", "title": "Extent of Damages", "content": "Damages shall include the loss actually suffered (damnum emergens) and the profit of which the creditor has been deprived (lucrum cessans). Damages are limited to what was foreseen or what could have been foreseen at the time of contracting."},
    {"number": "254", "title": "Moral Damages", "content": "Moral damages may be awarded in addition to material damages when the non-performance has caused moral suffering. Moral damages include pain and suffering, harm to reputation, and emotional distress."},
    
    # Civil Liability (Torts)
    {"number": "122", "title": "General Principle of Tort Liability", "content": "Any act whatsoever of a person that causes damage to another obliges the person by whose fault the damage occurred to compensate the injured party. This is the general principle of civil liability based on fault."},
    {"number": "123", "title": "Definition of Fault", "content": "A fault is any act or omission that a prudent and diligent person would not have committed in similar circumstances. Fault includes intentional acts (dol) and negligence (imprudence, carelessness, lack of attention)."},
    {"number": "124", "title": "Causation", "content": "The plaintiff must prove the existence of a causal link between the defendant's fault and the damage suffered. The damage must be the direct and immediate consequence of the fault."},
    {"number": "125", "title": "Damage", "content": "Compensable damage includes material damage (loss of property, lost profits) and moral damage (pain, suffering, harm to reputation). The damage must be certain, personal, and direct."},
    {"number": "131", "title": "Liability for Acts of Others", "content": "A person is liable not only for the damage caused by his own act but also for damage caused by the acts of persons for whom he is responsible: parents for their minor children, masters and employers for their servants and employees, teachers and artisans for their pupils and apprentices."},
    {"number": "132", "title": "Employer Liability (Vicarious)", "content": "Masters and employers are responsible for damage caused by their servants and employees in the exercise of their functions. This responsibility exists even if the employer has committed no personal fault."},
    {"number": "133", "title": "Liability for Things", "content": "A person who has custody of a thing is responsible for the damage caused by that thing, unless he proves force majeure or the fault of the victim. The custodian of a thing is the person who has the use, control, and direction of the thing."},
    {"number": "134", "title": "Liability for Animals", "content": "The owner of an animal or the person who uses it is responsible for the damage caused by the animal, whether the animal was in the owner's custody or had strayed or escaped."},
    {"number": "135", "title": "Liability for Buildings", "content": "The owner of a building is responsible for the damage caused by the collapse of the building when such collapse is due to lack of maintenance or a defect in construction."},
    
    # Quasi-Contracts
    {"number": "140", "title": "Management of Another's Affairs (Gestion d'affaires)", "content": "A person who voluntarily manages the affairs of another without being authorized to do so is bound to continue the management until the principal is able to attend to the matter himself. The manager must manage the affairs as a prudent administrator."},
    {"number": "141", "title": "Undue Payment (Paiement de l'indu)", "content": "A person who has paid what was not due has the right to recover the payment. The recipient must return what was paid, whether the payment was made by mistake of fact or mistake of law."},
    {"number": "142", "title": "Unjust Enrichment", "content": "A person who is enriched without cause at the expense of another must indemnify the other to the extent of the enrichment. The action for unjust enrichment is subsidiary and may be exercised only when no other legal action is available."},
    
    # Modes of Extinguishing Obligations
    {"number": "290", "title": "Payment (Performance)", "content": "An obligation is extinguished by payment, that is, by the voluntary performance of the obligation. Payment must be made to the creditor or to his authorized agent."},
    {"number": "299", "title": "Set-Off (Compensation)", "content": "Set-off takes place by operation of law when two persons are reciprocally debtor and creditor of each other. Set-off extinguishes both debts to the extent of the smaller debt."},
    {"number": "305", "title": "Release of Debt (Remise de dette)", "content": "The creditor may release the debtor from his obligation. The release may be total or partial. A release is not presumed and must be proven."},
    {"number": "307", "title": "Novation", "content": "Novation is the substitution of a new obligation for an old one. Novation may take place by changing the object of the obligation, the cause, or the person of the debtor."},
    {"number": "310", "title": "Prescription (Statute of Limitations)", "content": "Obligations are extinguished by prescription when the creditor fails to exercise his right within the time period fixed by law. The general prescription period is ten years. Special shorter periods apply to certain obligations as provided by law."},
    
    # BOOK II: SPECIFIC CONTRACTS
    # Sale
    {"number": "373", "title": "Definition of Sale", "content": "A sale is a contract by which one party (the seller) transfers or undertakes to transfer ownership of a thing to another party (the buyer) in exchange for a price in money."},
    {"number": "374", "title": "Essential Elements of Sale", "content": "The essential elements of a sale are: (1) the thing sold; (2) the price; and (3) the consent of the parties. The sale is complete when the parties have agreed on the thing and the price."},
    {"number": "375", "title": "Obligations of the Seller", "content": "The seller is bound to: (1) deliver the thing sold; (2) guarantee the buyer's peaceful possession of the thing; and (3) guarantee against hidden defects."},
    {"number": "376", "title": "Warranty Against Hidden Defects", "content": "The seller warrants the buyer against hidden defects that render the thing unfit for the use for which it was intended, or that diminish its value to such an extent that the buyer would not have purchased it or would have paid a lesser price. The warranty does not extend to apparent defects that the buyer could have discovered by reasonable inspection."},
    {"number": "377", "title": "Obligations of the Buyer", "content": "The buyer is bound to: (1) pay the price at the time and place agreed upon; (2) take delivery of the thing sold. If the buyer fails to pay the price, the seller may demand performance or dissolution of the sale with damages."},
    
    # Lease
    {"number": "543", "title": "Definition of Lease", "content": "A lease (bail) is a contract by which one party (the lessor) binds himself to grant the other party (the lessee) the enjoyment of a thing during a specified period in exchange for a rent (loyer) that the lessee undertakes to pay."},
    {"number": "544", "title": "Obligations of the Lessor", "content": "The lessor is bound to: (1) deliver the thing in good condition; (2) maintain the thing in a condition suitable for the use intended; (3) guarantee the lessee's peaceful enjoyment."},
    {"number": "545", "title": "Obligations of the Lessee", "content": "The lessee is bound to: (1) use the thing as a prudent administrator and in accordance with its intended use; (2) pay the rent at the agreed times; (3) return the thing at the end of the lease in the condition in which it was received, subject to normal wear and tear."},
    {"number": "546", "title": "Termination of Lease", "content": "A lease for a fixed term expires at the end of the agreed period without the need for notice. A lease for an indefinite period may be terminated by either party by giving notice as provided by law or custom."},
    
    # Mandate (Agency)
    {"number": "769", "title": "Definition of Mandate", "content": "A mandate (procuration) is a contract by which one person (the mandator or principal) gives another person (the mandatary or agent) the power to act on his behalf. A mandate may be general or special."},
    {"number": "770", "title": "Obligations of the Agent", "content": "The agent is bound to: (1) execute the mandate diligently; (2) account to the principal for the performance of the mandate; (3) return to the principal everything received in the execution of the mandate."},
    {"number": "771", "title": "Obligations of the Principal", "content": "The principal is bound to: (1) reimburse the agent for expenses incurred; (2) indemnify the agent for losses suffered in the execution of the mandate; (3) pay the agent's remuneration if agreed upon."},
    
    # Employment (Service Contract)
    {"number": "624", "title": "Definition of Employment Contract", "content": "A contract of employment is a contract by which one person (the employee) undertakes to place his services at the disposal of another person (the employer) under the latter's direction and supervision, in exchange for remuneration."},
    {"number": "625", "title": "Duration", "content": "A contract of employment may be for a fixed or indefinite period. A contract for a fixed period expires at the end of the agreed term. A contract for an indefinite period may be terminated by either party by giving reasonable notice."},
    {"number": "626", "title": "Employer Obligations Under Civil Code", "content": "The employer is bound to: (1) pay the agreed remuneration; (2) provide the necessary means for the employee to perform the work; (3) ensure the health and safety of the employee; (4) deliver a certificate of employment upon termination."},
    {"number": "627", "title": "Employee Obligations Under Civil Code", "content": "The employee is bound to: (1) perform the work personally and diligently; (2) follow the lawful instructions of the employer; (3) not engage in conduct harmful to the employer's interests."},
    {"number": "652", "title": "Termination Notice Requirements", "content": "Where termination of the contract issues from the employer and the contract has been in force for an indefinite period, the employer must give prior notice. The notice period depends on the duration of service and the nature of employment. Failure to give proper notice entitles the employee to compensation equivalent to the wages for the notice period."},
    {"number": "656", "title": "Compensation on Termination", "content": "Where the employer terminates the contract without just cause, the employee is entitled to compensation. The compensation shall take into account the employee's length of service, the nature of the employment, and any other relevant circumstances."},
    
    # Loan
    {"number": "750", "title": "Loan for Use (Commodat)", "content": "A loan for use (prêt à usage) is a contract by which one party delivers a thing to another for the latter's use, with the obligation to return the same thing. The borrower must use the thing for the purpose agreed upon and must care for it as a prudent administrator."},
    {"number": "755", "title": "Loan for Consumption (Mutuum)", "content": "A loan for consumption (prêt de consommation) is a contract by which one party delivers fungible things to another, who undertakes to return things of the same kind, quality, and quantity. Money loans are the most common form of loans for consumption."},
    {"number": "756", "title": "Interest on Loans", "content": "Interest may be stipulated in the loan contract. The rate of interest must not exceed the legal maximum. Compound interest (interest on interest) is prohibited unless agreed upon in writing and for periods of not less than one year."},
    
    # Guarantee (Suretyship)
    {"number": "745", "title": "Definition of Suretyship", "content": "Suretyship (cautionnement) is a contract by which a person (the surety) undertakes towards the creditor to perform the obligation of the principal debtor if the latter fails to perform it. Suretyship may be simple or solidary."},
    {"number": "746", "title": "Rights of the Surety", "content": "The surety who has paid the debt is subrogated to the rights of the creditor against the principal debtor. The surety has a right of recourse against the principal debtor for the amount paid."},
    
    # Deposit
    {"number": "689", "title": "Definition of Deposit", "content": "A deposit (dépôt) is a contract by which a person (the depositor) delivers a movable thing to another person (the depositary) who undertakes to keep it and return it in kind. The depositary must keep the thing with the same care as he keeps his own things."},
    
    # Partnership/Company
    {"number": "822", "title": "Definition of Partnership", "content": "A partnership (société) is a contract by which two or more persons agree to put something in common with a view to sharing the profits that may result therefrom. Each partner contributes money, property, industry, or skill."},
    {"number": "823", "title": "Partners' Obligations", "content": "Each partner must contribute what was agreed upon and share in the losses as well as in the profits. A clause exempting a partner from sharing in losses is void (clause léonine)."},
    
    # Mortgage and Pledge
    {"number": "95", "title": "Definition of Mortgage", "content": "A mortgage (hypothèque) is a real right over immovable property assigned for the performance of an obligation. The mortgage gives the creditor the right to be paid from the proceeds of the sale of the property in preference to other creditors."},
    {"number": "96", "title": "Pledge (Gage)", "content": "A pledge is a contract by which a debtor or a third person delivers a movable thing to the creditor as security for the debt. The pledgee has the right to retain the pledged thing until the debt is paid and, in case of non-payment, to have the thing sold and be paid from the proceeds."},
    
    # Additional provisions
    {"number": "260", "title": "Force Majeure", "content": "The debtor is released from liability when the non-performance of his obligation is due to force majeure or an act of God (cas fortuit), that is, an event that is irresistible, unforeseeable, and external to the debtor. Events such as war, natural disasters, and government prohibitions may constitute force majeure."},
    {"number": "261", "title": "Imprévision (Hardship)", "content": "When, as a result of exceptional and unforeseeable events of a general nature, the performance of the obligation becomes excessively onerous and threatens the debtor with exorbitant loss, the court may, according to the circumstances, reduce the obligation to a reasonable limit or dissolve the contract."},
    {"number": "262", "title": "Assignment of Claims", "content": "A creditor may assign his claim to a third party without the consent of the debtor. The assignment must be in writing and is effective against the debtor only upon notification."},
    {"number": "263", "title": "Subrogation", "content": "Subrogation operates by law or by agreement. The person who pays the debt of another is subrogated to the rights of the creditor. Legal subrogation occurs automatically in favor of the person who pays a debt for which he is liable jointly with others."},
    {"number": "677", "title": "Right of Retention", "content": "A creditor who holds a thing belonging to his debtor may retain that thing until the debt is paid, provided there is a connection between the claim and the thing retained."},
    {"number": "941", "title": "Partition", "content": "Every co-owner has the right to demand partition of the common property. Partition may be effected by agreement or by judicial decision. Partition has retroactive effect, and each co-owner is deemed to have owned his share from the beginning."},
]

law["key_articles"] = [
    {
        "article_number": a["number"],
        "title": a["title"],
        "content": a["content"],
        "penalties": "",
        "related_articles": []
    }
    for a in articles
]

data = {"laws": [law]}
with open("/home/user/workspace/casemap/data/obligations_code_expanded.json", "w") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print(f"Created obligations_code_expanded.json with {len(articles)} articles")
