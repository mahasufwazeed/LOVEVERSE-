#include "LVInteractionComponent.h"

#include "Net/UnrealNetwork.h"
#include "LVAvatarCharacter.h"
#include "LVInteractionDirector.h"

ULVInteractionComponent::ULVInteractionComponent()
{
    SetIsReplicatedByDefault(true);
}

void ULVInteractionComponent::RequestInteraction(ALVAvatarCharacter* Partner, ELVCoupleInteraction Interaction)
{
    if (Partner && Interaction != ELVCoupleInteraction::Idle)
    {
        ServerRequestInteraction(Partner, Interaction);
    }
}

void ULVInteractionComponent::RespondToPendingRequest(bool bAccepted)
{
    ServerRespondToPendingRequest(bAccepted);
}

void ULVInteractionComponent::ServerRequestInteraction_Implementation(ALVAvatarCharacter* Partner, ELVCoupleInteraction Interaction)
{
    ALVAvatarCharacter* Requester = Cast<ALVAvatarCharacter>(GetOwner());
    if (!Requester || !Partner || Requester == Partner || Interaction == ELVCoupleInteraction::Idle)
    {
        return;
    }

    ULVInteractionComponent* PartnerComponent = Partner->GetInteractionComponent();
    if (!PartnerComponent || PartnerComponent->PendingRequester)
    {
        return;
    }

    PartnerComponent->PendingRequester = Requester;
    PartnerComponent->PendingInteraction = Interaction;
    PartnerComponent->OnRep_PendingRequest();
}

void ULVInteractionComponent::ServerRespondToPendingRequest_Implementation(bool bAccepted)
{
    ALVAvatarCharacter* Recipient = Cast<ALVAvatarCharacter>(GetOwner());
    if (!Recipient || !PendingRequester)
    {
        return;
    }

    ALVAvatarCharacter* Requester = PendingRequester;
    const ELVCoupleInteraction RequestedInteraction = PendingInteraction;
    ClearPendingRequest();

    if (bAccepted && InteractionDirector)
    {
        InteractionDirector->StartAuthorizedInteraction(Requester, Recipient, RequestedInteraction);
    }
}

void ULVInteractionComponent::OnRep_PendingRequest()
{
    if (PendingRequester)
    {
        OnInteractionRequestReceived.Broadcast(PendingRequester, PendingInteraction);
    }
}

void ULVInteractionComponent::ClearPendingRequest()
{
    PendingRequester = nullptr;
    PendingInteraction = ELVCoupleInteraction::Idle;
}

void ULVInteractionComponent::GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& OutLifetimeProps) const
{
    Super::GetLifetimeReplicatedProps(OutLifetimeProps);
    DOREPLIFETIME(ULVInteractionComponent, PendingRequester);
    DOREPLIFETIME(ULVInteractionComponent, PendingInteraction);
}
